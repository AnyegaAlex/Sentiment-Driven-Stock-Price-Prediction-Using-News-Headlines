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

    def __str__(self):
        return f"{self.date} - {self.predicted_movement}"