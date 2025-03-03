import hashlib
import logging
import os
import re
import requests
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, Retry
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction, IntegrityError
from django.utils import timezone
import dateutil.parser
from .models import ProcessedNews
from .utils import analyze_sentiment  # FINBERT sentiment analysis utility
import spacy  # For key phrase extraction

logger = logging.getLogger(__name__)

API_TIMEOUT = 15  # seconds
MAX_ARTICLES = 100
LOG_FILE = os.path.join(settings.BASE_DIR, "logs", "news_fetch_log.txt")

# Load spaCy for key phrase extraction
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading the 'en_core_web_sm' model...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


def normalize_title(title):
    """
    Normalize the title by removing extra spaces, punctuation, and converting to lowercase.
    """
    if not title:
        return ""
    title = re.sub(r'\s+', ' ', title.strip().lower())
    title = re.sub(r'[^\w\s]', '', title)
    return title


def extract_key_phrases(text):
    """
    Extract key phrases from the article content using spaCy.
    """
    doc = nlp(text)
    key_phrases = [chunk.text for chunk in doc.noun_chunks if len(chunk.text.split()) > 1]
    return list(set(key_phrases))[:5]  # Limit to top 5 unique key phrases


def get_source_reliability(source):
    """
    Assign a reliability score to the source based on predefined rules.
    """
    trusted_sources = {
        "financial times": 90,
        "bloomberg": 95,
        "reuters": 85,
        "yahoo finance": 80,
    }
    return trusted_sources.get(source.lower(), 50)  # Default to 50% for unknown sources


def _fetch_alpha_vantage(symbol):
    """Alpha Vantage API with proper error handling."""
    params = {
        'function': 'NEWS_SENTIMENT',
        'tickers': symbol,
        'apikey': settings.ALPHA_VANTAGE_KEY,
        'limit': 50,
        'sort': 'LATEST'
    }
    response = requests.get(
        'https://www.alphavantage.co/query',
        params=params,
        timeout=API_TIMEOUT
    )
    response.raise_for_status()
    data = response.json()
    if 'feed' not in data:
        if 'Error Message' in data:
            raise ValueError(f"Alpha Vantage Error: {data['Error Message']}")
        raise ValueError("Invalid Alpha Vantage response structure")
    
    # Process articles: assign banner_image_url based on Alpha Vantage's field
    articles = data['feed'][:MAX_ARTICLES]
    for article in articles:
        article['banner_image_url'] = article.get('banner_image', '')
    return articles


def _fetch_finnhub(symbol):
    """Finnhub API with date range parameters."""
    today = datetime.utcnow().date()
    seven_days_ago = today - timedelta(days=7)
    response = requests.get(
        'https://finnhub.io/api/v1/company-news',
        params={
            'symbol': symbol,
            'from': seven_days_ago.strftime('%Y-%m-%d'),
            'to': today.strftime('%Y-%m-%d'),
            'token': settings.FINNHUB_API_KEY
        },
        timeout=API_TIMEOUT
    )
    response.raise_for_status()
    # Process articles: assign banner_image_url based on Finnhub's field
    articles = response.json()[:MAX_ARTICLES]
    for article in articles:
        article['banner_image_url'] = article.get('image', '')
    return articles


def _fetch_yahoo_finance(symbol):
    """Yahoo Finance API with updated endpoint."""
    headers = {
        'x-rapidapi-key': settings.RAPIDAPI_KEY,
        'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
    }
    response = requests.get(
        'https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-news',
        params={'symbol': symbol, 'count': 50},
        headers=headers,
        timeout=API_TIMEOUT
    )
    response.raise_for_status()
    data = response.json()
    
    # Determine which key contains the news articles
    if 'items' in data:
        articles = data['items']
    elif 'news' in data:
        articles = data['news']
    else:
        articles = []
    
    # Process articles: assign banner_image_url using Yahoo Finance's field
    for article in articles:
        # Yahoo Finance may use 'thumbnail' field with nested data
        article['banner_image_url'] = article.get('thumbnail', {}).get('resolutions', [{}])[0].get('url', '')
    return articles


def _filter_recent_articles(articles):
    """Filter articles from the last 24 hours."""
    cutoff = timezone.now() - timedelta(hours=24)
    filtered_articles = []
    for article in articles:
        published_at = _parse_date(article)
        if published_at is None:
            logger.warning("Skipping article with invalid date during filtering")
            continue
        if published_at >= cutoff:
            filtered_articles.append(article)
    return filtered_articles


@shared_task(bind=True, autoretry_for=(requests.HTTPError, ConnectionError), retry_backoff=120, max_retries=2, retry_jitter=True)
def fetch_and_process_news(self, symbol, fetch_latest_only=True):
    """
    Fetch and process news articles with improved error handling and API-specific parsing.
    Steps:
      1. Check database cache for recent articles.
      2. Fetch articles from APIs (Alpha Vantage, Finnhub, Yahoo Finance).
      3. Optionally filter for recent articles.
      4. Process each article: normalize, analyze sentiment, extract key phrases, and save.
    """
    try:
        # Step 1: Check database cache for recent articles
        cutoff = timezone.now() - timedelta(hours=24)
        cached_articles = ProcessedNews.objects.filter(
            symbol=symbol,
            published_at__gte=cutoff
        ).order_by('-published_at')[:MAX_ARTICLES]

        if cached_articles.exists():
            logger.info(f"Found {len(cached_articles)} cached articles for {symbol}")
            return {
                'status': 'success',
                'symbol': symbol,
                'new_articles': 0,
                'duplicates': len(cached_articles)
            }

        # Step 2: Fetch articles from APIs
        articles = []
        # Attempt fetching articles from each API in sequence, break on successful fetch api_providers
        for provider_name, fetcher in [
            ('alphavantage', _fetch_alpha_vantage),
            ('finnhub', _fetch_finnhub),
            ('yahoo', _fetch_yahoo_finance)
        ]:
            try:
                logger.info(f"Attempting {provider_name} for {symbol}")
                articles = fetcher(symbol)
                if articles:
                    logger.info(f"Retrieved {len(articles)} articles from {provider_name}")
                    break
            except requests.HTTPError as e:
                if e.response.status_code == 429:
                    logger.warning(f"Rate limited by {provider_name}. Retrying...")
                    raise self.retry(exc=e, countdown=60)
                logger.warning(f"{provider_name} HTTP error: {str(e)}")
            except Exception as e:
                logger.warning(f"{provider_name} failed: {str(e)}")
                continue

        if not articles:
            logger.error(f"No articles found for {symbol}")
            return {'status': 'error', 'message': 'No articles found'}

        if fetch_latest_only:
            articles = _filter_recent_articles(articles)

        new_articles, duplicate_count = _process_articles(symbol, articles)
        _write_log(f"Processed {new_articles} new, {duplicate_count} duplicates for {symbol}")
        return {
            'status': 'success',
            'symbol': symbol,
            'new_articles': new_articles,
            'duplicates': duplicate_count
        }
    except Exception as e:
        logger.error(f"Critical failure processing {symbol}: {str(e)}", exc_info=True)
        try:
            raise self.retry(exc=e, countdown=300)
        except MaxRetriesExceededError:
            return {'status': 'failed', 'message': 'Max retries exceeded'}


def _process_articles(symbol, articles):
    """
    Process articles by:
      - Deduplicating based on a unique hash computed from title and publication date.
      - Analyzing sentiment and extracting key phrases.
      - Determining source reliability.
      - Atomically updating or creating records in the database.
    """
    new_articles = 0
    duplicate_count = 0

    # Phase 1: In-memory deduplication using consistent hashing.
    seen_hashes = set()
    deduped_articles = []
    for article in articles:
        title = normalize_title(
            article.get('title') or article.get('headline') or article.get('description', '')
        )
        if not title:
            continue

        published_at = _parse_date(article)
        if not published_at:
            logger.warning("Skipping article with invalid date")
            continue

        # Round published timestamp to the nearest minute for consistent deduplication.
        rounded_timestamp = round(published_at.timestamp() / 60) * 60
        unique_string = f"{title}_{rounded_timestamp}"
        title_hash = hashlib.sha256(unique_string.encode('utf-8')).hexdigest()

        if title_hash not in seen_hashes:
            seen_hashes.add(title_hash)
            # Store the computed hash for later use.
            article['computed_title_hash'] = title_hash
            deduped_articles.append(article)
    articles = deduped_articles

    # Phase 2: Process each deduplicated article and update the database.
    for article in articles:
        try:
            title = normalize_title(
                article.get('title') or article.get('headline') or article.get('description', '')
            )
            if not title:
                continue

            published_at = _parse_date(article)
            if not published_at:
                continue

            # Compute hash consistently (rounding to nearest minute)
            rounded_timestamp = round(published_at.timestamp() / 60) * 60
            unique_string = f"{title}_{rounded_timestamp}"
            title_hash = hashlib.sha256(unique_string.encode('utf-8')).hexdigest()

            # Prepare content and analyze sentiment
            content = f"{title} {article.get('summary', '')}"
            sentiment_result = analyze_sentiment(content)
            sentiment = sentiment_result.get('label', 'neutral').lower()
            sentiment_score = sentiment_result.get('score', 0.0)
            key_phrases = extract_key_phrases(content)
            source = article.get('source') or article.get('publisher', '')
            source_reliability = get_source_reliability(source)

            defaults = {
                "title": title[:200],
                "summary": article.get('summary', '')[:500],
                "source": source[:100],
                "url": article.get('url') or article.get('link', ''),
                "published_at": published_at,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "key_phrases": ", ".join(key_phrases),
                "source_reliability": source_reliability,
                "banner_image_url": article.get('banner_image_url', ''),
                "raw_data": article,
            }

            with transaction.atomic():
                obj, created = ProcessedNews.objects.update_or_create(
                    title_hash=title_hash,
                    symbol=symbol,
                    defaults=defaults
                )
            if created:
                new_articles += 1
            else:
                duplicate_count += 1
        except IntegrityError as e:
            logger.warning(f"IntegrityError: {str(e)}")
            duplicate_count += 1
        except Exception as e:
            logger.error(f"Skipping article: {str(e)}")
    return new_articles, duplicate_count

def _parse_date(article):
    """Universal date parser with strict error handling."""
    date_value = (
        article.get('time_published') or 
        article.get('datetime') or 
        article.get('date') or 
        article.get('pubDate')
    )
    if not date_value:
        logger.warning("No date found in article")
        return None

    if isinstance(date_value, int):
        try:
            return datetime.fromtimestamp(date_value / 1000, tz=timezone.utc)
        except ValueError:
            return datetime.fromtimestamp(date_value, tz=timezone.utc)

    for fmt in (
        '%Y%m%dT%H%M%S', 
        '%Y-%m-%dT%H:%M:%SZ', 
        '%Y-%m-%d %H:%M:%S',
        '%a, %d %b %Y %H:%M:%S %Z'
    ):
        try:
            dt = datetime.strptime(date_value, fmt)
            return timezone.make_aware(dt, timezone.utc)
        except (ValueError, TypeError):
            continue

    try:
        dt = dateutil.parser.parse(date_value)
        return timezone.make_aware(dt, timezone.utc)
    except Exception:
        logger.error(f"Unparseable date: {date_value}")
        return None


def _write_log(message):
    """Thread-safe logging."""
    with open(LOG_FILE, "a") as f:
        f.write(f"{datetime.utcnow().isoformat()} - {message}\n")
