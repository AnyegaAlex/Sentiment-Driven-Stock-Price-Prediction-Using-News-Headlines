from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from .models import ProcessedNews, SymbolSearchCache
from .utils import analyze_sentiment, normalize_confidence  # Import helper functions
from .tasks import fetch_and_process_news, extract_key_phrases  # Import key functions
import requests
from datetime import datetime, timedelta
import logging
from dateutil import parser  # For parsing dates
from django.db.utils import IntegrityError

logger = logging.getLogger(__name__)

# Constants
CACHE_TTL = 3600  # 1 hour in seconds
MAX_ARTICLES = 50


def fetch_news_from_alpha_vantage(symbol):
    """Fetch news from Alpha Vantage."""
    try:
        response = requests.get(
            'https://www.alphavantage.co/query',
            params={
                'function': 'NEWS_SENTIMENT',
                'tickers': symbol,
                'apikey': settings.ALPHA_VANTAGE_KEY,
                'limit': MAX_ARTICLES
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        if "Information" in data or "Note" in data or not data.get('feed'):
            logger.warning(f"Alpha Vantage failed for {symbol}: {data.get('Information') or data.get('Note')}")
            return None
        return data.get('feed', [])
    except requests.RequestException as e:
        logger.error(f"Alpha Vantage request failed for {symbol}: {e}")
        return None


def fetch_news_from_finnhub(symbol):
    """Fetch news from Finnhub for the given symbol over the last 7 days."""
    try:
        to_date = datetime.today()
        from_date = to_date - timedelta(days=7)
        response = requests.get(
            "https://finnhub.io/api/v1/company-news",
            params={
                'symbol': symbol,
                'from': from_date.strftime('%Y-%m-%d'),
                'to': to_date.strftime('%Y-%m-%d'),
                'token': settings.FINNHUB_API_KEY,
            },
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Finnhub request failed for {symbol}: {e}")
        return None


def fetch_news_from_yahoo(symbol):
    """Fetch news from Yahoo Finance via RapidAPI as a fallback."""
    try:
        response = requests.get(
            "https://yahoo-finance159.p.rapidapi.com/news/list-by-symbol",
            headers={
                'x-rapidapi-key': settings.RAPIDAPI_KEY,
                'x-rapidapi-host': settings.RAPIDAPI_HOST
            },
            params={
                's': symbol,
                'region': 'US',
                'snippetCount': MAX_ARTICLES
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return data.get('items', [])
    except requests.RequestException as e:
        logger.error(f"Yahoo Finance request failed for {symbol}: {e}")
        return None


def standardize_article(article, provider):
    """
    Normalize articles from different providers.
    :param provider: 'alpha_vantage', 'finnhub', or 'yahoo'
    """
    if provider == 'alpha_vantage':
        title = article.get('title', '')
        summary = article.get('summary', '')
        source = article.get('source', 'Unknown')
        published_str = article.get('time_published', '')
        try:
            published_at = datetime.strptime(published_str, '%Y%m%dT%H%M%S') if published_str else datetime.now()
        except ValueError:
            published_at = datetime.now()
        url = article.get('url', '#')  # Fallback URL
    elif provider == 'finnhub':
        title = article.get('headline', '')
        summary = article.get('summary', '')
        source = article.get('source', 'Unknown')
        published_at = datetime.fromtimestamp(article.get('datetime', 0))
        url = article.get('url', '#')
    elif provider == 'yahoo':
        title = article.get('title', '')
        summary = article.get('summary', '')
        source = article.get('source', 'Unknown')
        published_at = parser.parse(article.get('pubDate')) if article.get('pubDate') else datetime.now()
        url = article.get('link', '#')
    else:
        title = summary = source = url = ""
        published_at = datetime.now()

    return {
        'title': title,
        'summary': summary,
        'source': source,
        'published_at': published_at,
        'url': url,
        'raw_data': article
    }


def process_news_articles(articles):
    """
    Normalize and fix missing confidence values for a list of articles.
    """
    processed = []
    for article in articles:
        confidence = article.get("confidence")
        if confidence is None:
            logger.warning(f"Missing confidence score: {article}")
        elif not (0 <= confidence <= 1):
            logger.error(f"Invalid confidence value ({confidence}): {article}")

        # Normalize confidence using the helper function.
        article["confidence"] = normalize_confidence(confidence)
        processed.append(article)
    return processed


def extract_confidence(api_response):
    """Extract and normalize confidence from API response."""
    if "confidence" in api_response:
        return normalize_confidence(api_response["confidence"])
    elif "score" in api_response:  # Some APIs might use 'score'
        return normalize_confidence(api_response["score"])
    return 0.5  # Default if missing


@api_view(['GET'])
def get_analyzed_news(request):
    """
    Retrieve analyzed news for a stock symbol.
    Steps:
    1. Check the database cache.
    2. Attempt to fetch from Alpha Vantage.
    3. Fallback to Finnhub, then Yahoo Finance if needed.
    4. Standardize and analyze each article, save it, and return the data.
    """
    symbol = request.GET.get('symbol', 'IBM').upper()

    try:
        # Check cache first
        cached = ProcessedNews.objects.filter(symbol=symbol).order_by('-published_at')[:MAX_ARTICLES]
        if cached.exists() and (timezone.now() - cached[0].created_at).total_seconds() < CACHE_TTL:
            logger.info(f"Returning cached news for {symbol}")
            return Response({
                'symbol': symbol,
                'news': [{
                    'title': n.title,
                    'summary': n.summary,
                    'source': n.source,
                    'url': n.url,
                    'published_at': n.published_at,
                    'sentiment': n.sentiment,
                    'confidence': n.confidence,
                    'key_phrases': n.key_phrases,
                    'source_reliability': n.source_reliability,
                    'banner_image_url': n.banner_image_url or ""
                } for n in cached]
            })

        # Fetch from providers
        articles = fetch_news_from_alpha_vantage(symbol)
        provider = 'alpha_vantage'

        if not articles:
            logger.info(f"Alpha Vantage failed for {symbol}. Trying Finnhub.")
            articles = fetch_news_from_finnhub(symbol)
            provider = 'finnhub'

        if not articles:
            logger.info(f"Finnhub failed for {symbol}. Trying Yahoo Finance.")
            articles = fetch_news_from_yahoo(symbol)
            provider = 'yahoo'

        if not articles:
            return Response({'error': f"Unable to fetch news for {symbol} from any provider."}, status=500)

        # Process each article: standardize, analyze sentiment, extract key phrases, and determine source reliability.
        saved_articles = []
        for article in articles:
            std_article = standardize_article(article, provider)
            combined_text = f"{std_article['title']} {std_article['summary']}"
            # Capture sentiment analysis result as a dictionary
            sentiment_result = analyze_sentiment(combined_text)
            sentiment = sentiment_result.get('label', 'neutral')
            confidence = normalize_confidence(sentiment_result.get('score', 0.5))

            # Extract key phrases from the combined text.
            key_phrases = extract_key_phrases(combined_text)

            # Determine source reliability.
            source_reliability = get_source_reliability(std_article['source'])

            news_obj = ProcessedNews(
                symbol=symbol,
                title=std_article['title'],
                summary=std_article['summary'],
                source=std_article['source'],
                url=std_article['url'],
                published_at=std_article['published_at'],
                sentiment=sentiment,
                confidence=confidence,
                key_phrases=", ".join(key_phrases),
                source_reliability=source_reliability,
                banner_image_url=std_article['raw_data'].get('banner_image_url', ''),
                raw_data=std_article['raw_data']
            )

            news_obj.save()
            saved_articles.append(news_obj)

        logger.info(f"Saved {len(saved_articles)} articles for {symbol} using {provider}.")
        return Response({
            'symbol': symbol,
            'news': [{
                'title': n.title,
                'summary': n.summary,
                'source': n.source,
                'url': n.url,
                'published_at': n.published_at,
                'sentiment': n.sentiment,
                'confidence': n.confidence,
                'key_phrases': n.key_phrases,
                'source_reliability': n.source_reliability,
                'banner_image_url': n.banner_image_url or ""
            } for n in saved_articles]
        })

    except Exception as e:
        logger.error(f"Error in get_analyzed_news for {symbol}: {e}", exc_info=True)
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def get_news(request):
    """
    Retrieve processed news for a given stock symbol.
    If a refresh is requested or no processed news exists, trigger an asynchronous task.
    """
    symbol = request.GET.get('symbol', 'IBM').upper()
    force_refresh = request.GET.get('refresh', 'false').lower() == 'true'

    if force_refresh or not ProcessedNews.objects.filter(symbol=symbol).exists():
        fetch_and_process_news.delay(symbol)

    news = ProcessedNews.objects.filter(symbol=symbol).order_by('-published_at')[:MAX_ARTICLES]
    return Response({
        'symbol': symbol,
        'news': [{
            'title': n.title,
            'summary': n.summary,
            'source': n.source,
            'url': n.url,
            'published_at': n.published_at,
            'sentiment': n.sentiment,
            'confidence': n.confidence,
            'key_phrases': n.key_phrases,
            'source_reliability': n.source_reliability,
            'banner_image_url': n.banner_image_url or ""
        } for n in news]
    })


@api_view(['GET'])
def symbol_search(request):
    """
    Search for stock symbols using Alpha Vantage or Yahoo Finance as a fallback.
    """
    query = request.GET.get('q', '').strip()
    if not query:
        return Response({'error': 'Query parameter "q" is required'}, status=400)

    # Check cache
    cache_instance = SymbolSearchCache.objects.filter(query=query).first()
    if cache_instance and cache_instance.is_valid:
        return Response(cache_instance.results)

    try:
        # Try Alpha Vantage
        response = requests.get(
            'https://www.alphavantage.co/query',
            params={
                'function': 'SYMBOL_SEARCH',
                'keywords': query,
                'apikey': settings.ALPHA_VANTAGE_KEY
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        if 'bestMatches' in data:
            results = data['bestMatches']
        else:
            # Fallback to Yahoo Finance
            response = requests.get(
                'https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete',
                params={'q': query, 'region': 'US'},
                headers={
                    'X-RapidAPI-Key': settings.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': settings.RAPIDAPI_HOST
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            results = data.get('quotes', [])

        # Cache the results
        SymbolSearchCache.objects.update_or_create(
            query=query,
            defaults={
                'results': results,
                'expires_at': timezone.now() + timedelta(minutes=30)
            }
        )

        return Response(results)

    except requests.RequestException as e:
        logger.error(f"Symbol search failed for query '{query}': {e}")
        return Response({'error': str(e)}, status=500)


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
    return trusted_sources.get(source.lower(), 70)  # Default to 70% for unknown sources
