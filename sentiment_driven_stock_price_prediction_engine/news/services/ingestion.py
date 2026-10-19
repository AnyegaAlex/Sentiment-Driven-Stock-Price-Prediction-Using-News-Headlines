# news/services/ingestion.py
import gc
import hashlib
import logging
import re
from datetime import datetime, timezone as dt_timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from django.utils import timezone
from django.db import transaction, close_old_connections

import dateutil.parser
from news.models import ProcessedNews
from news.utils import analyze_sentiment
from .providers import ProviderManager

logger = logging.getLogger(__name__)

_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are",
    "was", "were", "will", "has", "have", "had", "its", "their", "they", "them",
}

class IngestionService:
    """
    Handles the processing and storage of raw news data.
    Ensures database optimization via bulk_create and rigorous deduplication.
    """
    
    @staticmethod
    def normalize_title(title: str) -> str:
        return re.sub(r"[^\w\s]", "", (title or "").strip().lower())

    @staticmethod
    def _parse_date(value: Any) -> Optional[datetime]:
        if not value:
            return None
        try:
            if isinstance(value, int):
                return datetime.fromtimestamp(value, tz=dt_timezone.utc)
            if isinstance(value, str) and value.isdigit():
                iv = int(value)
                return datetime.fromtimestamp(iv / (1000.0 if iv > 1_000_000_000_000 else 1), tz=dt_timezone.utc)
            
            # Alpha Vantage specific formats
            for fmt in ("%Y%m%dT%H%M%S", "%Y%m%dT%H%M"):
                try:
                    return datetime.strptime(value, fmt).replace(tzinfo=dt_timezone.utc)
                except ValueError:
                    pass
                    
            # General ISO 8601 or RFC 2822 parsing
            dt = dateutil.parser.parse(value)
            return timezone.make_aware(dt, dt_timezone.utc) if timezone.is_naive(dt) else dt.astimezone(dt_timezone.utc)
        except Exception:
            return None

    @classmethod
    def standardize_article(cls, symbol: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raw_date = raw.get("datetime") or raw.get("time_published") or raw.get("published_at") or raw.get("providerPublishTime")
        published_at = cls._parse_date(raw_date)
        
        title = (raw.get("title") or raw.get("headline") or raw.get("description") or "").strip()
        if not title or not published_at:
            return None

        summary = (raw.get("summary") or raw.get("content") or raw.get("snippet") or "").strip()
        provider = (raw.get("provider") or raw.get("source") or raw.get("publisher") or "other").strip()
        source_name = (raw.get("source_name") or raw.get("publisher") or raw.get("source") or provider).strip()
        
        title_norm = cls.normalize_title(title)
        rounded_ts = int(round(published_at.timestamp() / 60) * 60)
        title_hash = hashlib.sha256(f"{title_norm}_{rounded_ts}".encode("utf-8")).hexdigest()
        
        # Analyze sentiment
        combined_text = f"{title} {summary}".strip()
        sentiment = analyze_sentiment(combined_text) or {}
        label = (sentiment.get("label") or "neutral").lower()
        score = float(sentiment.get("score", 0.0))

        return {
            "symbol": symbol,
            "title_hash": title_hash,
            "title": title[:200],
            "summary": summary[:500],
            "url": (raw.get("url") or raw.get("link") or "")[:2000],
            "provider": provider[:50],
            "source_name": source_name[:255],
            "published_at": published_at,
            "sentiment": label,
            "confidence": max(0.0, min(1.0, abs(score))),
            "sentiment_score": score,
            "banner_image_url": (raw.get("banner_image_url") or raw.get("image") or "")[:500],
            "raw_data": raw,
        }

    @classmethod
    def process_and_save(cls, symbol: str, raw_articles: List[Dict[str, Any]], recent_hours: int = 24) -> Tuple[int, int]:
        """
        Processes raw articles and uses bulk_create for maximum speed.
        Returns: (new_count, duplicate_count)
        """
        close_old_connections()
        
        # 1. Filter by date first to save CPU
        cutoff = timezone.now() - timedelta(hours=recent_hours)
        valid_raw = []
        for a in raw_articles:
            raw_date = a.get("datetime") or a.get("time_published") or a.get("published_at") or a.get("providerPublishTime")
            dt = cls._parse_date(raw_date)
            if dt and dt >= cutoff:
                valid_raw.append(a)

        if not valid_raw:
            return 0, 0

        # 2. Standardize & Analyze
        standardized = []
        for raw in valid_raw:
            std = cls.standardize_article(symbol, raw)
            if std:
                standardized.append(std)

        if not standardized:
            return 0, 0

        # 3. Deduplicate against DB
        hashes = [a["title_hash"] for a in standardized]
        existing_hashes = set(
            ProcessedNews.objects.filter(symbol=symbol, title_hash__in=hashes)
            .values_list("title_hash", flat=True)
        )

        new_articles = [
            ProcessedNews(**{k: v for k, v in a.items() if k not in ["created_at", "updated_at"]})
            for a in standardized if a["title_hash"] not in existing_hashes
        ]

        # 4. Bulk Insert
        if new_articles:
            try:
                with transaction.atomic():
                    ProcessedNews.objects.bulk_create(new_articles, ignore_conflicts=True)
                logger.info(f"Bulk created {len(new_articles)} new articles for {symbol}")
            except Exception as e:
                logger.error(f"Bulk create failed for {symbol}: {e}")
                raise
                
        return len(new_articles), len(standardized) - len(new_articles)