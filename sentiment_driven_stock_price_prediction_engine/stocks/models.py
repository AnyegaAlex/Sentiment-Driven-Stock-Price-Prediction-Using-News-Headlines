from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

class StockOpinion(models.Model):
    # Define clear choices for actions and time horizons.
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

    # Core fields
    symbol = models.CharField(max_length=10, help_text="Stock ticker (e.g., AAPL)")
    timestamp = models.DateTimeField(auto_now_add=True, help_text="When the opinion was generated")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, help_text="Recommended action")
    horizon = models.CharField(max_length=20, choices=HORIZON_CHOICES, help_text="Investment horizon")

    # Confidence scores (0-100 scale)
    technical_confidence = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)],
                                               help_text="Confidence from technical analysis")
    sentiment_confidence = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)],
                                               help_text="Confidence from sentiment analysis")
    composite_confidence = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)],
                                               help_text="Overall composite confidence")

    # Detailed explanation and factor details for transparency
    explanation = models.TextField(max_length=2000, help_text="Detailed explanation of recommendation")
    factors = models.JSONField(default=dict, blank=True, help_text="Key technical and sentiment factors")
    risk_metrics = models.JSONField(default=dict, blank=True, help_text="Risk metrics (stop-loss, take-profit, etc.)")
    contrarian_warnings = models.JSONField(default=list, blank=True, help_text="Warnings when indicators conflict")
    historical_accuracy = models.JSONField(default=dict, blank=True, help_text="Historical accuracy metrics")
    news_data = models.JSONField(default=dict, blank=True, help_text="News data used for analysis")

    def clean(self):
        super().clean()
        # Ensure composite confidence is not lower than the individual confidences.
        if self.composite_confidence < min(self.technical_confidence, self.sentiment_confidence):
            raise ValidationError("Composite confidence cannot be lower than both technical and sentiment confidence.")
        # Validate that risk metrics include required keys.
        required_risk_fields = ['stop_loss', 'take_profit', 'risk_reward_ratio']
        if self.risk_metrics and not all(field in self.risk_metrics for field in required_risk_fields):
            raise ValidationError(f"Risk metrics must include: {', '.join(required_risk_fields)}")

    def __str__(self):
        return f"{self.symbol} - {self.get_action_display()} ({self.get_horizon_display()}) @ {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Stock Opinion"
        verbose_name_plural = "Stock Opinions"
        indexes = [
            models.Index(fields=['symbol', 'timestamp']),
            models.Index(fields=['action', 'horizon']),
        ]
