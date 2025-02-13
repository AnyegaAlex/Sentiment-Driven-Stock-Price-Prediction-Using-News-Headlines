# news/external_apis.py
import logging
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)

def parse_published_at(date_str):
    """
    Parse the published_at string from external APIs.
    Adjust formats as needed.
    """
    try:
        # Example: if date_str is a UNIX timestamp (for Finnhub)
        if isinstance(date_str, (int, float)):
            return datetime.fromtimestamp(date_str)
        # Otherwise, try to parse as ISO format
        return datetime.fromisoformat(date_str)
    except Exception as e:
        logger.warning("Failed to parse date %s: %s", date_str, e)
        return None

def fetch_alpha(symbol: str):
    """
    Fetch news from Alpha Vantage for the given symbol.
    """
    try:
        response = requests.get(
            'https://www.alphavantage.co/query',
            params={
                'function': 'NEWS_SENTIMENT',
                'tickers': symbol,
                'apikey': settings.ALPHA_VANTAGE_API_KEY,
            },
            timeout=5
        )
        data = response.json()
        articles = data.get('feed', [])
        return [
            {
                'title': article.get('title'),
                'summary': article.get('summary', ''),
                'source': 'Alpha Vantage',
                'published_at': parse_published_at(article.get('time_published')) or "",
                'sentiment': article.get('overall_sentiment', 'neutral'),
                'confidence': float(article.get('confidence', 0.5)),
                'url': article.get('url', '#'),
            }
            for article in articles
        ]
    except Exception as e:
        logger.error("Alpha Vantage API error for %s: %s", symbol, e)
        return []

def fetch_finnhub(symbol: str):
    """
    Fetch news from Finnhub for the given symbol.
    """
    try:
        response = requests.get(
            'https://finnhub.io/api/v1/news',
            params={
                'category': 'general',
                'symbol': symbol,
                'token': settings.FINNHUB_API_KEY,
            },
            timeout=5
        )
        data = response.json()
        return [
            {
                'title': item.get('headline'),
                'summary': item.get('summary', ''),
                'source': 'Finnhub',
                'published_at': parse_published_at(item.get('datetime')) or "",
                'sentiment': 'neutral',  # Adjust if Finnhub provides sentiment info
                'confidence': 0.5,
                'url': item.get('url', '#'),
            }
            for item in data
        ]
    except Exception as e:
        logger.error("Finnhub API error for %s: %s", symbol, e)
        return []

def fetch_yahoo(symbol: str):
    """
    Fetch news from Yahoo Finance (dummy implementation – replace with actual API call).
    """
    try:
        response = requests.get(
            'https://api.example.com/yahoo/news',
            params={'symbol': symbol},
            timeout=5
        )
        data = response.json()
        articles = data.get('articles', [])
        return [
            {
                'title': article.get('title'),
                'summary': article.get('description', ''),
                'source': 'Yahoo Finance',
                'published_at': parse_published_at(article.get('publishedAt')) or "",
                'sentiment': article.get('sentiment', 'neutral'),
                'confidence': float(article.get('confidence', 0.5)),
                'url': article.get('url', '#'),
            }
            for article in articles
        ]
    except Exception as e:
        logger.error("Yahoo Finance API error for %s: %s", symbol, e)
        return []
