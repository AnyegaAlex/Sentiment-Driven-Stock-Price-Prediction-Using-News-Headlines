# news/tasks.py
import hashlib
import logging
import os
import requests
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction, IntegrityError
from django.utils import timezone
import dateutil.parser
from .models import ProcessedNews, StockSymbol
from .utils import analyze_sentiment

logger = logging.getLogger(__name__)

API_TIMEOUT = 15  # seconds
MAX_ARTICLES = 100
LOG_FILE = os.path.join(settings.BASE_DIR, "logs", "news_fetch_log.txt")

@shared_task(bind=True, autoretry_for=(Exception, requests.HTTPError), retry_backoff=60, max_retries=3)
def fetch_and_process_news(self, symbol, fetch_latest_only=True):
    """
    Fetch and process news articles with improved error handling and API-specific parsing.
    """
    try:
        articles = []
        api_providers = [
            ('alphavantage', _fetch_alpha_vantage),
            ('finnhub', _fetch_finnhub),
            ('yahoo', _fetch_yahoo_finance)
        ]
        
        for provider_name, fetcher in api_providers:
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
            logger.error(f"No articles found for {symbol} across all APIs")
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
    
    return data['feed'][:MAX_ARTICLES]

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
    
    if 'items' in data:
        return data['items']
    if 'news' in data:
        return data['news']
    return []

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
    return response.json()[:MAX_ARTICLES]

def _filter_recent_articles(articles):
    """Filter articles from the last 24 hours."""
    cutoff = timezone.now() - timedelta(hours=24)
    return [article for article in articles if _parse_date(article) >= cutoff]

def _process_articles(symbol, articles):
    """Process articles with API-specific field mapping using update_or_create."""
    new_articles = 0
    duplicate_count = 0

    for article in articles:
        try:
            title = (
                article.get('title') or 
                article.get('headline') or 
                article.get('description', '')
            ).strip().lower()
            if not title:
                continue

            title_hash = hashlib.sha256(title.encode('utf-8')).hexdigest()

            # Prepare content for sentiment analysis.
            content = f"{title} {article.get('summary', '')}"
            sentiment, confidence = analyze_sentiment(content)

            # For Alpha Vantage API-specific sentiment data.
            if 'ticker_sentiment' in article:
                ticker_data = next(
                    (ts for ts in article['ticker_sentiment'] if ts.get('ticker') == symbol),
                    {}
                )
                try:
                    sentiment = float(ticker_data.get('sentiment_score', sentiment))
                    confidence = float(ticker_data.get('relevance_score', confidence))
                except ValueError:
                    pass  # Keep the previously computed sentiment values if conversion fails.

            defaults = {
                "title": title[:200],
                "summary": article.get('summary', '')[:500],
                "source": (article.get('source') or article.get('publisher', '')[:100]),
                "url": article.get('url') or article.get('link', ''),
                "published_at": _parse_date(article),
                "sentiment": sentiment,
                "confidence": confidence,
                "raw_data": article,
            }

            obj, created = ProcessedNews.objects.update_or_create(
                title_hash=title_hash, 
                symbol=symbol, 
                defaults=defaults
            )

            if created:
                new_articles += 1
            else:
                duplicate_count += 1

        except Exception as e:
            logger.error(f"Skipping article due to error: {str(e)}")
            continue

    return new_articles, duplicate_count

def _parse_date(article):
    """Universal date parser with timezone support."""
    date_value = (
        article.get('time_published') or 
        article.get('datetime') or 
        article.get('date') or 
        article.get('pubDate')
    )
    
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
        logger.warning(f"Failed to parse date: {date_value}")
        return timezone.now()

def _write_log(message):
    """Thread-safe logging."""
    with open(LOG_FILE, "a") as f:
        f.write(f"{datetime.utcnow().isoformat()} - {message}\n")
