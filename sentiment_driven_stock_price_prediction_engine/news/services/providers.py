# news/services/providers.py
import logging
import requests
from typing import List, Dict, Any
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class ProviderManager:
    """
    Manages external API calls with daisy-chaining fallback.
    Ensures secure, observable, and robust fetching.
    """
    def __init__(self):
        self.timeout = 10
        self.user_agent = "TickflowCapital/1.1.0 (Open Source Data Pipeline)"
        
    def fetch(self, symbol: str) -> List[Dict[str, Any]]:
        """Daisy-chains providers until one succeeds."""
        session = requests.Session()
        session.headers.update({"User-Agent": self.user_agent})
        
        # Order matters: Finnhub (fast, 60/min) -> RapidAPI (fallback) -> AlphaVantage (25/day limit)
        providers = [
            ("Finnhub", self._fetch_finnhub),
            ("RapidAPI", self._fetch_yahoo_rapidapi),
            ("AlphaVantage", self._fetch_alpha_vantage)
        ]
        
        for name, fetch_method in providers:
            try:
                logger.info(f"Attempting to fetch {symbol} from {name}")
                articles = fetch_method(session, symbol)
                if articles:
                    logger.info(f"Successfully fetched {len(articles)} articles from {name} for {symbol}")
                    return articles
            except ValueError as e:
                # Catch specific rate limit errors to prevent retries
                logger.warning(f"Provider {name} rate limited or returned invalid data: {e}")
            except Exception as e:
                logger.error(f"Provider {name} failed for {symbol}: {e}")
        
        logger.error(f"All providers failed for {symbol}")
        return []

    def _fetch_finnhub(self, session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
        today = timezone.now().date()
        seven_days_ago = today - timedelta(days=7)
        url = "https://finnhub.io/api/v1/company-news"
        params = {
            "symbol": symbol,
            "from": seven_days_ago.strftime("%Y-%m-%d"),
            "to": today.strftime("%Y-%m-%d"),
            "token": settings.FINNHUB_API_KEY,
        }
        r = session.get(url, params=params, timeout=self.timeout)
        
        if r.status_code == 429:
            raise ValueError("Finnhub Rate Limit Exceeded (429)")
        r.raise_for_status()
        
        items = r.json() or []
        return [{"banner_image_url": a.get("image", ""), **a} for a in items[:50]]

    def _fetch_yahoo_rapidapi(self, session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
        if not getattr(settings, 'RAPIDAPI_KEY', None):
            return []
            
        url = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-news"
        headers = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": settings.RAPIDAPI_HOST,
        }
        params = {"symbol": symbol, "count": 50}
        
        r = session.get(url, params=params, headers=headers, timeout=self.timeout)
        r.raise_for_status()
        
        data = r.json() or {}
        articles = data.get("items") or data.get("news") or []
        return articles[:50]

    def _fetch_alpha_vantage(self, session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
        if not getattr(settings, 'ALPHA_VANTAGE_KEY', None):
            return []

        url = "https://www.alphavantage.co/query"
        params = {
            "function": "NEWS_SENTIMENT",
            "tickers": symbol,
            "apikey": settings.ALPHA_VANTAGE_KEY,
            "limit": 50,
            "sort": "LATEST",
        }
        r = session.get(url, params=params, timeout=self.timeout)
        r.raise_for_status()
        data = r.json() or {}
        
        # Alpha Vantage returns 200 OK even when rate limited
        if "Note" in data or "Information" in data:
            raise ValueError(f"Alpha Vantage Limit: {data.get('Note') or data.get('Information')}")
        if "feed" not in data:
            raise ValueError(data.get("Error Message", "Invalid response"))
            
        feed = data.get("feed") or []
        return [{"banner_image_url": a.get("banner_image", ""), **a} for a in feed[:50]]