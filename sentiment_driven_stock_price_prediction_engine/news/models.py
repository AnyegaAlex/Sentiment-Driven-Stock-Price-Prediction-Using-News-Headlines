import re
import hashlib
import logging
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.core.exceptions import ValidationError
from django.urls import reverse

logger = logging.getLogger(__name__)


class ProcessedNews(models.Model):
    PROVIDER_CHOICES = [
        ('alpha', 'Alpha Vantage'),
        ('yahoo', 'Yahoo Finance'),
        ('finnhub', 'Finnhub'),
        ('other', 'Other'),
    ]

    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('negative', 'Negative'),
        ('neutral', 'Neutral'),
    ]

    symbol = models.CharField(max_length=10, db_index=True)
    title = models.TextField(help_text="Raw article headline")
    title_hash = models.CharField(max_length=64, editable=False, db_index=True)

    summary = models.TextField(blank=True, null=True)
    url = models.URLField(max_length=2000, blank=True, null=True)

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='other')
    source_name = models.CharField(max_length=120, blank=True, default="")  # Reuters, Bloomberg, etc.

    published_at = models.DateTimeField(db_index=True)

    sentiment = models.CharField(max_length=10, choices=SENTIMENT_CHOICES, db_index=True)
    confidence = models.FloatField(default=0.5, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    sentiment_score = models.FloatField(default=0.0)

    key_phrases = models.TextField(blank=True, default="")
    source_reliability = models.IntegerField(default=70, validators=[MinValueValidator(0), MaxValueValidator(100)])
    banner_image_url = models.URLField(max_length=500, blank=True, default="")
    raw_data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at']
        constraints = [
            models.UniqueConstraint(fields=['title_hash', 'symbol'], name='unique_article_per_symbol'),
        ]

    @property
    def source(self) -> str:
        """Alias for frontend: return source_name."""
        return self.source_name or self.provider

    @staticmethod
    def _normalize_title(title: str) -> str:
        t = (title or "").strip().lower()
        t = re.sub(r"\s+", " ", t)
        t = re.sub(r"[^\w\s]", "", t)
        return t

    def _compute_title_hash(self) -> str:
        ts = int(self.published_at.timestamp() // 60) if self.published_at else 0
        base = f"{self._normalize_title(self.title)}_{ts}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        if not self.symbol or not self.title:
            raise ValidationError("Symbol and title are required.")
        if self.published_at and self.published_at > timezone.now():
            raise ValidationError("Publication date cannot be in the future.")
        self.title_hash = self._compute_title_hash()
        if self.sentiment == "positive":
            self.sentiment_score = abs(float(self.confidence))
        elif self.sentiment == "negative":
            self.sentiment_score = -abs(float(self.confidence))
        else:
            self.sentiment_score = 0.0
        super().save(*args, **kwargs)

    def clean(self):
        if self.confidence < 0.4:
            logger.warning(f"Low confidence ({self.confidence}) for: {self.title[:50]}")
        if self.published_at > timezone.now():
            raise ValidationError("Publication date cannot be in the future")

    @property
    def sentiment_color(self):
        return {
            'positive': 'green',
            'negative': 'red',
            'neutral': 'gray'
        }.get(self.sentiment, 'gray')

    @property
    def is_recent(self):
        return (timezone.now() - self.published_at).total_seconds() < 86400

    def get_absolute_url(self):
        return self.url or reverse('news-detail', kwargs={'pk': self.pk})

    @classmethod
    def recent_positive_news(cls, symbol, hours=24):
        return cls.objects.filter(
            symbol=symbol,
            sentiment='positive',
            published_at__gte=timezone.now() - timedelta(hours=hours)
        )


class StockSymbolManager(models.Manager):
    def active_symbols(self):
        return self.filter(is_active=True)

    def needs_processing(self, threshold_mins=120):
        cutoff = timezone.now() - timedelta(minutes=threshold_mins)
        return self.filter(
            models.Q(last_processed__lt=cutoff) | models.Q(last_processed__isnull=True),
            is_active=True
        )


class SymbolSearchCache(models.Model):
    query = models.CharField(max_length=255, db_index=True)
    results = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name = 'Symbol Search Cache'
        verbose_name_plural = 'Symbol Search Caches'
        indexes = [models.Index(fields=['expires_at', 'query'])]
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=30)
        super().save(*args, **kwargs)

    def clean(self):
        if self.expires_at < timezone.now():
            raise ValidationError("Expiration date must be in the future")

    @property
    def is_valid(self):
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"'{self.query}' cache (expires {self.expires_at:%Y-%m-%d %H:%M})"


class StockSymbol(models.Model):
    symbol = models.CharField(max_length=10, unique=True, db_index=True)
    last_processed = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = StockSymbolManager()

    class Meta:
        verbose_name = 'Stock Symbol'
        verbose_name_plural = 'Stock Symbols'
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} ({'active' if self.is_active else 'inactive'})"

    @property
    def hours_since_last_update(self):
        if self.last_processed:
            delta = timezone.now() - self.last_processed
            return round(delta.total_seconds() / 3600, 1)
        return None

    @classmethod
    def active_symbols(cls):
        return cls.objects.filter(is_active=True)

    def get_last_processed_delta(self):
        if self.last_processed:
            return (timezone.now() - self.last_processed).total_seconds()
        return None