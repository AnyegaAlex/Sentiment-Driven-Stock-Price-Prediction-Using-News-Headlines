# news/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import hashlib
from django.core.validators import URLValidator

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
        blank=True
    )
    symbol = models.CharField(
        max_length=10, 
        db_index=True, 
        help_text="Stock ticker symbol"
    )
    title = models.TextField(help_text="Article headline")
    title_hash = models.CharField(
        max_length=64, 
        unique=True, 
        editable=False,
        help_text="SHA-256 hash of the title for uniqueness"
    )
    summary = models.TextField(
        blank=True, 
        null=True, 
        help_text="Processed article summary"
    )
    source = models.CharField(
        max_length=20, 
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
    confidence = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Sentiment confidence score 0-1"
    )
    raw_data = models.JSONField(
        default=dict, 
        help_text="Raw API response data"
    )
    #latest URL at all times
    def save(self, *args, **kwargs):
        if self.pk:  # Existing instance
            original = ProcessedNews.objects.get(pk=self.pk)
            if self.url != original.url:
                raise ValidationError("URL cannot be modified once set")
        super().save(*args, **kwargs)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Processed News Article'
        verbose_name_plural = 'Processed News Articles'
        ordering = ['-published_at']
        indexes = [
            models.Index(fields=['symbol', '-published_at']),
            models.Index(fields=['source', 'sentiment']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['title_hash', 'symbol'],
                name='unique_article_per_symbol'
            )   
        ]

    def __str__(self):
        return f"{self.symbol} - {self.title[:50]}"

    def save(self, *args, **kwargs):
        """Generate title hash before saving"""
        if not self.title_hash:
            self.title_hash = hashlib.sha256(
                self.title.strip().lower().encode('utf-8')
            ).hexdigest()
        super().save(*args, **kwargs)

    @property
    def sentiment_color(self):
        return {
            'positive': 'green',
            'negative': 'red',
            'neutral': 'gray'
        }.get(self.sentiment, 'gray')

    @property
    def is_recent(self):
        """Check if article was published within last 24 hours"""
        return (timezone.now() - self.published_at).total_seconds() < 86400


class SymbolSearchCache(models.Model):
    query = models.CharField(max_length=100, db_index=True)
    results = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name = 'Symbol Search Cache'
        verbose_name_plural = 'Symbol Search Caches'
        indexes = [
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """Set default expiration (30 minutes) if not provided"""
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=30)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Check if cache entry is still fresh"""
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"'{self.query}' cache (expires {self.expires_at})"

class StockSymbol(models.Model):
    symbol = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.symbol