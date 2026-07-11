from rest_framework import serializers
from .models import StockOpinion, Prediction, Subscription

# Existing serializers (keep as is)
class StockOpinionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockOpinion
        fields = '__all__'
        read_only_fields = ['timestamp']

class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = '__all__'
        read_only_fields = ['created_at']

# ======== NEW SERIALIZERS ========

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['email']
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False}
        }

    def validate_email(self, value):
        # Basic email format validation (Django's EmailField already does this)
        return value


class StockAnalysisSerializer(serializers.Serializer):
    """
    Serializer for the unified /api/stock-analysis endpoint.
    Matches frontend spec exactly.
    """
    company = serializers.CharField()
    symbol = serializers.CharField()
    recommendation = serializers.CharField()          # "BUY", "SELL", "HOLD"
    confidence = serializers.FloatField()             # 0.0 - 1.0
    sentiment = serializers.FloatField()              # -1.0 to 1.0
    lastUpdated = serializers.DateTimeField()

    # Nested objects
    technicalIndicators = serializers.DictField()
    priceTargets = serializers.DictField()
    keyFactors = serializers.ListField(child=serializers.DictField())
    riskAssessment = serializers.DictField()


class TechnicalIndicatorsSerializer(serializers.Serializer):
    technical = serializers.DictField()


class SymbolSerializer(serializers.Serializer):
    symbol = serializers.CharField()
    name = serializers.CharField()
    region = serializers.CharField()