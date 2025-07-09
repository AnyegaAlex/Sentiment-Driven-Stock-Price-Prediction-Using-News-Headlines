import gc
import hashlib
import logging
import os
import re
import requests
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, Retry
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction, IntegrityError, connection
from django.utils import timezone
import dateutil.parser
from .models import ProcessedNews
from .utils import analyze_sentiment  # FINBERT sentiment analysis utility
import spacy  # For key phrase extraction

logger = logging.getLogger(__name__)

API_TIMEOUT = 15  # seconds
MAX_ARTICLES = 100
LOG_FILE = os.path.join(settings.BASE_DIR, "logs", "news_fetch_log.txt")
BATCH_SIZE = 20  # Process articles in batches

# Lazy-loaded NLP model
_nlp = None

def get_nlp():
    """Lazy loader for spaCy model to prevent multiple loads"""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
        except OSError:
            logger.info("Downloading spaCy model...")
            from spacy.cli import download
            download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
    return _nlp

def cleanup_resources():
    """Release memory-intensive resources."""
    global _nlp
    if _nlp:
        try:
            _nlp.vocab.strings.clear()
            del _nlp
        except Exception as e:
            logger.warning(f"NLP cleanup failed: {e}")
        _nlp = None
    gc.collect()
    if connection.connection is not None:
        connection.close()


def normalize_title(title):
    return re.sub(r'[^\w\s]', '', title.strip().lower()) if title else ""

def extract_key_phrases(text):
    """Extract key noun phrases (up to 5)"""
    if not text or len(text) > 10000:
        return []
    try:
        doc = get_nlp()(text[:10000])
        return list({chunk.text for chunk in doc.noun_chunks if len(chunk.text.split()) > 1})[:5]
    except Exception as e:
        logger.error(f"Key phrase extraction failed: {str(e)}")
        return []

def _parse_date(article):
    value = article.get("time_published") or article.get("datetime") or article.get("date") or article.get("pubDate")
    if not value:
        return None
    try:
        if isinstance(value, int):
            return datetime.fromtimestamp(value / 1000 if value > 1e12 else value, tz=timezone.utc)
        for fmt in ("%Y%m%dT%H%M%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
            try:
                return timezone.make_aware(datetime.strptime(value, fmt), timezone.utc)
            except ValueError:
                continue
        return timezone.make_aware(dateutil.parser.parse(value), timezone.utc)
    except Exception:
        logger.warning(f"Date parse failed: {value}")
        return None
    
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

def _process_article(article, symbol):
    try:
        title = normalize_title(article.get("title") or article.get("headline") or article.get("description", ""))
        if not title:
            return None, False
        published_at = _parse_date(article)
        if not published_at:
            return None, False

        rounded_timestamp = round(published_at.timestamp() / 60) * 60
        hash_input = f"{title}_{rounded_timestamp}".encode("utf-8")
        title_hash = hashlib.sha256(hash_input).hexdigest()

        content = f"{title} {article.get('summary', '')}"
        sentiment = analyze_sentiment(content)
        key_phrases = extract_key_phrases(content)

        defaults = {
            "title": title[:200],
            "summary": article.get("summary", "")[:500],
            "source": (article.get("source") or article.get("publisher", ""))[:100],
            "url": article.get("url") or article.get("link", ""),
            "published_at": published_at,
            "sentiment": sentiment.get("label", "neutral").lower(),
            "sentiment_score": float(sentiment.get("score", 0.0)),
            "key_phrases": ", ".join(key_phrases),
            "source_reliability": get_source_reliability(article.get("source")),
            "banner_image_url": article.get("banner_image_url", ""),
            "raw_data": article,
        }

        with transaction.atomic():
            _, created = ProcessedNews.objects.update_or_create(
                title_hash=title_hash,
                symbol=symbol,
                defaults=defaults
            )
        return title_hash, created
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return None, False

def _process_articles(symbol, articles):
    seen_hashes = set()
    new_count = dup_count = 0

    for i in range(0, len(articles), BATCH_SIZE):
        batch = articles[i:i+BATCH_SIZE]
        for article in batch:
            title_hash, created = _process_article(article, symbol)
            if not title_hash:
                continue
            if title_hash in seen_hashes:
                dup_count += 1
                continue
            seen_hashes.add(title_hash)
            if created:
                new_count += 1
            else:
                dup_count += 1
        del batch
        gc.collect()
    return new_count, dup_count

def _filter_recent_articles(articles):
    """Filter articles from last 24 hours"""
    cutoff = timezone.now() - timedelta(hours=24)
    return [a for a in articles if (dt := _parse_date(a)) and dt >= cutoff]


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
        raise ValueError(data.get('Error Message', 'Invalid response'))
    return [{'banner_image_url': a.get('banner_image', ''), **a} for a in data['feed'][:MAX_ARTICLES]]
    
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
    return [{'banner_image_url': a.get('image', ''), **a} for a in response.json()[:MAX_ARTICLES]]


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
    
    articles = data.get('items', data.get('news', []))
    return [{
        'banner_image_url': a.get('thumbnail', {}).get('resolutions', [{}])[0].get('url', ''),
        **a
    } for a in articles[:MAX_ARTICLES]]

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=120,
    max_retries=2,
    time_limit=300,
    soft_time_limit=240
)
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
        cutoff = timezone.now() - timedelta(hours=24)
        if ProcessedNews.objects.filter(symbol=symbol, published_at__gte=cutoff).exists():
            logger.info(f"Cached articles exist for {symbol}")
            return {'status': 'success', 'new_articles': 0, 'duplicates': 0}

        fetchers = [_fetch_alpha_vantage, _fetch_finnhub, _fetch_yahoo_finance]
        articles = []
        for fetch in fetchers:
            try:
                articles = fetch(symbol)
                if articles:
                    break
            except Exception as e:
                logger.warning(f"API fetch failed: {e}")
                continue

        if not articles:
            return {'status': 'error', 'message': 'No articles found'}

        if fetch_latest_only:
            articles = _filter_recent_articles(articles)

        new_count, dup_count = _process_articles(symbol, articles)
        return {
            'status': 'success',
            'new_articles': new_count,
            'duplicates': dup_count
        }

    except MemoryError:
        logger.critical("Memory exhausted during processing.")
        cleanup_resources()
        raise self.retry(countdown=300)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        cleanup_resources()
        raise self.retry(exc=e, countdown=300)
    finally:
        cleanup_resources()

def _write_log(message):
    """Thread-safe logging"""
    try:
        with open(LOG_FILE, "a") as f:
            f.write(f"{datetime.utcnow().isoformat()} - {message}\n")
    except Exception as e:
        logger.error(f"Log write failed: {str(e)}")