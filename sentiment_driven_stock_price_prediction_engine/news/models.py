import re
import hashlib
import logging
from datetime import timedelta  # Added to use timedelta correctly
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.core.exceptions import ValidationError
from django.urls import reverse

logger = logging.getLogger(__name__)


class ProcessedNewsManager(models.Manager):
    def transform_article(self, article):
        # Map 'score' to 'confidence' if present and validate the value.
        if 'score' in article:
            try:
                # Convert to float if needed.
                article['confidence'] = float(article.pop('score'))
                # Ensure the confidence is between 0 and 1.
                if not (0.0 <= article['confidence'] <= 1.0):
                    raise ValidationError("Confidence must be a number between 0 and 1")
            except (ValueError, TypeError):
                # If conversion fails, default to a neutral confidence.
                article['confidence'] = 0.5
        return article

    def bulk_create_safe(self, articles):
        """Safe bulk create with conflict handling, transforming incoming articles if needed."""
        transformed_articles = [self.transform_article(article) for article in articles]
        return self.bulk_create(
            [self.model(**article) for article in transformed_articles],
            update_conflicts=True,
            update_fields=['summary', 'sentiment', 'confidence', 'updated_at'],
            unique_fields=['title_hash', 'symbol']
        )


class ProcessedNews(models.Model):
    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('negative', 'Negative'),
        ('neutral', 'Neutral')
    ]
    SOURCE_CHOICES = [
        ('alpha', 'Alpha Vantage'),
        ('yahoo', 'Yahoo Finance'),
        ('finnhub', 'Finnhub'),
        ('other', 'Other')
    ]

    url = models.CharField(
        max_length=2000,
        validators=[URLValidator()],
        blank=True,
        null=True,
        help_text="Original article URL"
    )
    symbol = models.CharField(
        max_length=10, 
        db_index=True,
        help_text="Stock ticker symbol"
    )
    title = models.TextField(help_text="Normalized article headline")
    # Removed unique=True from title_hash to enforce uniqueness only per (title_hash, symbol)
    title_hash = models.CharField(
        max_length=64, 
        editable=False,
        db_index=True,
        help_text="SHA-256 hash of normalized title"
    )
    summary = models.TextField(
        blank=True, 
        null=True,
        help_text="Processed article summary"
    )
    # Increased max_length for source from 20 to 100 to match the processing in tasks.py
    source = models.CharField(
        max_length=100, 
        choices=SOURCE_CHOICES, 
        default='other'
    )
    published_at = models.DateTimeField(
        db_index=True,
        help_text="Original publication timestamp"
    )
    sentiment = models.CharField(
        max_length=10, 
        choices=SENTIMENT_CHOICES, 
        db_index=True
    )
    sentiment_score = models.FloatField(default=0.0)
    confidence = models.FloatField(
        default=0.5,  # Default to neutral sentiment
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Sentiment confidence score 0-1"
    )
    key_phrases = models.TextField(
        blank=True,
        help_text="Extracted key phrases (comma-separated)"
    )
    source_reliability = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=70,
        help_text="Reliability score (0-100)"
    )
    raw_data = models.JSONField(
        default=dict,
        help_text="Raw API response data"
    )
 # Added fields for banner image URL and timestamp for when the article was created
    banner_image_url = models.URLField(
        max_length=500, 
        blank=True, 
        default='',
        verbose_name="Banner Image URL"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProcessedNewsManager()

    class Meta:
        verbose_name = 'Processed News Article'
        verbose_name_plural = 'Processed News Articles'
        ordering = ['-published_at']
        indexes = [
            models.Index(fields=['symbol', '-published_at', 'sentiment']),
            models.Index(fields=['source', 'sentiment']),
            models.Index(fields=['source_reliability', 'published_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['title_hash', 'symbol'],
                name='unique_article_per_symbol'
            ),
            models.CheckConstraint(
                check=models.Q(confidence__gte=0.0) & models.Q(confidence__lte=1.0),
                name="confidence_range"
            ),
            models.CheckConstraint(
                check=models.Q(source_reliability__gte=0) & models.Q(source_reliability__lte=100),
                name="reliability_range"
            )
        ]

    def __str__(self):
        return f"{self.symbol} - {self.title[:50]}"

    def save(self, *args, **kwargs):
        # Ensure confidence is a valid float within 0 and 1.
        if not isinstance(self.confidence, (float, int)) or not (0.0 <= self.confidence <= 1.0):
            raise ValidationError("Confidence must be a number between 0 and 1")
                
        # Generate normalized title hash if not present.
        if not self.title_hash:
            normalized_title = re.sub(r'\s+', ' ', self.title.strip().lower())
            normalized_title = re.sub(r'[^\w\s]', '', normalized_title)
            self.title_hash = hashlib.sha256(normalized_title.encode()).hexdigest()

        # Validate required fields.
        if not self.symbol or not self.title:
            raise ValidationError("Symbol and title are required fields")

        logger.debug(f"Saving ProcessedNews: {self.title[:50]}")
        super().save(*args, **kwargs)

    def clean(self):
        """Business logic validation."""
        if self.confidence < 0.4:  # Match utils.py confidence threshold
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
        """Returns True if published within the last 24 hours."""
        return (timezone.now() - self.published_at).total_seconds() < 86400

    def get_absolute_url(self):
        return self.url or reverse('news-detail', kwargs={'pk': self.pk})

    @classmethod
    def recent_positive_news(cls, symbol, hours=24):
        return cls.objects.filter(
            symbol=symbol,
            sentiment='positive',
            published_at__gte=timezone.now() - timedelta(hours=hours)  # Use timedelta from datetime
        )

    @classmethod
    def bulk_create_safe(cls, articles):
        # Using our custom manager method for safe bulk creation.
        return cls.objects.bulk_create_safe(articles)


class StockSymbolManager(models.Manager):
    def active_symbols(self):
        return self.filter(is_active=True)

    def needs_processing(self, threshold_mins=120):
        """Get symbols needing refresh."""
        cutoff = timezone.now() - timedelta(minutes=threshold_mins)  # Fixed: using timedelta from datetime
        return self.filter(
            models.Q(last_processed__lt=cutoff) | 
            models.Q(last_processed__isnull=True),
            is_active=True
        )


class SymbolSearchCache(models.Model):
    query = models.CharField(max_length=255, db_index=True, help_text="Search query string")
    results = models.JSONField(default=list, help_text="Cached search results")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True, help_text="Cache expiration timestamp")

    class Meta:
        verbose_name = 'Symbol Search Cache'
        verbose_name_plural = 'Symbol Search Caches'
        indexes = [
            models.Index(fields=['expires_at', 'query']),
        ]
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Ensure expires_at is set using timedelta from datetime.
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
    symbol = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text="Stock ticker symbol"
    )
    last_processed = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last news processing time"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Include in regular processing"
    )
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
