from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

class StockOpinion(models.Model):
    ACTION_CHOICES = [
        ('strong_buy', 'Strong Buy'),
        ('buy', 'Buy'),
        ('hold', 'Hold'),
        ('sell', 'Sell'),
        ('strong_sell', 'Strong Sell'),
    ]
    HORIZON_CHOICES = [
        ('short', 'Short-Term (1-4 days)'),
        ('medium', 'Medium-Term (1-4 weeks)'),
        ('long', 'Long-Term (4+ weeks)'),
    ]

    symbol = models.CharField(max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    horizon = models.CharField(max_length=20, choices=HORIZON_CHOICES)
    technical_confidence = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    sentiment_confidence = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    composite_confidence = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    explanation = models.TextField(max_length=2000)
    factors = models.JSONField(default=dict)
    risk_metrics = models.JSONField(default=dict)
    contrarian_warnings = models.JSONField(default=list)
    historical_accuracy = models.JSONField(default=dict)
    news_data = models.JSONField(default=dict)

    def clean(self):
        super().clean()
        if self.composite_confidence < min(self.technical_confidence, self.sentiment_confidence):
            raise ValidationError("Composite confidence cannot be lower than both technical and sentiment confidence.")
        required_risk_fields = ['stop_loss', 'take_profit', 'risk_reward_ratio']
        if self.risk_metrics and not all(field in self.risk_metrics for field in required_risk_fields):
            raise ValidationError(f"Risk metrics must include: {', '.join(required_risk_fields)}")

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['symbol', 'timestamp']),
            models.Index(fields=['action', 'horizon']),
        ]

    def __str__(self):
        return f"{self.symbol} - {self.get_action_display()} ({self.get_horizon_display()})"


class Prediction(models.Model):
    date = models.DateField()
    stock_symbol = models.CharField(max_length=10, default="IBM")
    headline = models.TextField()
    sentiment_score = models.FloatField()
    predicted_movement = models.CharField(max_length=10)  # 'up', 'down', 'neutral'
    confidence = models.FloatField()
    actual_movement = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(
        max_length=50,
        default='lstm',
        help_text="Source of prediction: lstm, technical, manual, etc."
    )

    # ============================================================
    #  – Accuracy Tracking
    # ============================================================
    
    # Price tracking
    price_at_prediction = models.DecimalField(
        max_digits=12, 
        decimal_places=4, 
        null=True, 
        blank=True,
        help_text="Stock price when prediction was made"
    )
    price_at_resolution = models.DecimalField(
        max_digits=12, 
        decimal_places=4, 
        null=True, 
        blank=True,
        help_text="Stock price when prediction was resolved"
    )
    
    # Outcome tracking
    actual_direction = models.CharField(
        max_length=10, 
        null=True, 
        blank=True,
        choices=[('up', 'Up'), ('down', 'Down'), ('neutral', 'Neutral')],
        help_text="Actual price movement direction"
    )
    is_correct = models.BooleanField(
        null=True, 
        blank=True,
        help_text="Whether prediction was correct"
    )
    
    # Timing
    resolution_date = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When the prediction was resolved"
    )
    time_to_resolution = models.DurationField(
        null=True, 
        blank=True,
        help_text="Time between prediction and resolution"
    )
    
    # Performance
    price_change_percent = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Percentage change from prediction to resolution"
    )

    # ============================================================
    # – SHAP Explainability
    # ============================================================
    
    shap_values = models.JSONField(
        null=True, 
        blank=True,
        help_text="SHAP values per feature for this prediction"
    )
    feature_importance = models.JSONField(
        null=True, 
        blank=True,
        help_text="Feature importance rankings"
    )
    prediction_explanation = models.TextField(
        null=True, 
        blank=True,
        help_text="Plain English explanation of why the model predicted this"
    )

    # ============================================================
    # – Market Context
    # ============================================================
    
    market_context = models.JSONField(
        null=True, 
        blank=True,
        help_text="Market context (e.g., SPY performance, sector performance)"
    )

    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['stock_symbol', '-date']),
            models.Index(fields=['is_correct']),
            models.Index(fields=['resolution_date']),
        ]

    def __str__(self):
        return f"{self.date} - {self.predicted_movement} ({self.source})"

    @classmethod
    def prune_old_records(cls, max_per_symbol=500):
        """
        Delete the oldest predictions for each symbol, keeping only the most recent `max_per_symbol` records.
        This prevents unlimited database growth and keeps query performance high.
        """
        from django.db.models import Count, OuterRef, Subquery, F

        # Identify symbols that have more than max_per_symbol records
        symbols = cls.objects.values('stock_symbol').annotate(
            cnt=Count('id')
        ).filter(cnt__gt=max_per_symbol)

        for item in symbols:
            symbol = item['stock_symbol']
            # Get the IDs of the most recent max_per_symbol records for this symbol
            keep_ids = list(
                cls.objects.filter(stock_symbol=symbol)
                .order_by('-date', '-id')
                .values_list('id', flat=True)[:max_per_symbol]
            )
            if keep_ids:
                # Delete all other records for this symbol
                cls.objects.filter(stock_symbol=symbol).exclude(id__in=keep_ids).delete()


# ============================================================
# – Performance Snapshot
# ============================================================

class ModelPerformanceSnapshot(models.Model):
    """
    Daily snapshot of model performance metrics.
    Used for tracking accuracy, F1, and drift detection over time.
    """
    date = models.DateField(help_text="Date of the performance snapshot")
    symbol = models.CharField(
        max_length=10, 
        null=True, 
        blank=True,
        help_text="Symbol this snapshot is for. Null = overall performance"
    )
    
    # Basic metrics
    total_predictions = models.IntegerField(default=0)
    correct_predictions = models.IntegerField(default=0)
    accuracy = models.FloatField(default=0.0)
    
    # Confusion matrix components
    true_positives = models.IntegerField(default=0)
    false_positives = models.IntegerField(default=0)
    true_negatives = models.IntegerField(default=0)
    false_negatives = models.IntegerField(default=0)
    
    # Classification metrics
    precision = models.FloatField(default=0.0)
    recall = models.FloatField(default=0.0)
    f1_score = models.FloatField(default=0.0)
    balanced_accuracy = models.FloatField(default=0.0)
    
    # Drift detection
    drift_detected = models.BooleanField(default=False)
    drift_severity = models.CharField(
        max_length=20, 
        null=True, 
        blank=True,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        help_text="Severity of drift detected"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['date', 'symbol']),
            models.Index(fields=['symbol']),
        ]
        unique_together = [['date', 'symbol']]  # One snapshot per symbol per day
    
    def __str__(self):
        return f"{self.symbol or 'Overall'} - {self.date} (F1: {self.f1_score}%)"


class Subscription(models.Model):
    email = models.EmailField(unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.email