from rest_framework import serializers
from .models import StockOpinion, Prediction, Subscription, ModelPerformanceSnapshot

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


# ============================================================
# – API RESPONSE SERIALIZERS
# ============================================================

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


# ============================================================
# – PREDICTION HISTORY SYSTEM
# ============================================================

class PredictionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed prediction serializer with all accuracy and SHAP fields.
    Use this for the main prediction list and detail views.
    """
    # Computed fields
    accuracy_label = serializers.SerializerMethodField()
    confidence_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = Prediction
        fields = [
            'id', 
            'date', 
            'stock_symbol', 
            'headline', 
            'sentiment_score',
            'predicted_movement', 
            'confidence',
            'confidence_percent',
            'source',
            # Accuracy fields
            'price_at_prediction', 
            'price_at_resolution', 
            'actual_direction',
            'is_correct', 
            'accuracy_label',
            'resolution_date', 
            'time_to_resolution',
            'price_change_percent',
            # SHAP fields
            'shap_values', 
            'feature_importance',
            'prediction_explanation',
            # Market context
            'market_context',
            # Metadata
            'created_at'
        ]
        read_only_fields = '__all__'
    
    def get_accuracy_label(self, obj):
        if obj.is_correct is None:
            return 'Pending'
        return 'Correct' if obj.is_correct else 'Incorrect'
    
    def get_confidence_percent(self, obj):
        return round(obj.confidence * 100, 1) if obj.confidence else 0


class PredictionListSerializer(serializers.ModelSerializer):
    """
    Lightweight prediction serializer for list views.
    Only includes essential fields for performance.
    """
    confidence_percent = serializers.SerializerMethodField()
    accuracy_label = serializers.SerializerMethodField()
    
    class Meta:
        model = Prediction
        fields = [
            'id', 
            'date', 
            'stock_symbol', 
            'predicted_movement',
            'confidence_percent',
            'actual_direction',
            'is_correct',
            'accuracy_label',
            'price_change_percent',
            'source'
        ]
    
    def get_confidence_percent(self, obj):
        return round(obj.confidence * 100, 1) if obj.confidence else 0
    
    def get_accuracy_label(self, obj):
        if obj.is_correct is None:
            return 'Pending'
        return 'Correct' if obj.is_correct else 'Incorrect'


class PredictionAccuracySerializer(serializers.ModelSerializer):
    """
    Minimal serializer for accuracy tracking.
    Used for performance metric calculations.
    """
    class Meta:
        model = Prediction
        fields = [
            'id',
            'stock_symbol',
            'predicted_movement',
            'actual_direction',
            'is_correct',
            'confidence',
            'price_change_percent'
        ]


class ModelPerformanceSnapshotSerializer(serializers.ModelSerializer):
    """
    Serializer for daily performance snapshots.
    """
    # Computed fields
    accuracy_label = serializers.SerializerMethodField()
    drift_status = serializers.SerializerMethodField()
    
    class Meta:
        model = ModelPerformanceSnapshot
        fields = [
            'id',
            'date',
            'symbol',
            'total_predictions',
            'correct_predictions',
            'accuracy',
            'accuracy_label',
            'true_positives',
            'false_positives',
            'true_negatives',
            'false_negatives',
            'precision',
            'recall',
            'f1_score',
            'balanced_accuracy',
            'drift_detected',
            'drift_severity',
            'drift_status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_accuracy_label(self, obj):
        if obj.accuracy >= 70:
            return 'Good'
        elif obj.accuracy >= 50:
            return 'Fair'
        return 'Poor'
    
    def get_drift_status(self, obj):
        if not obj.drift_detected:
            return 'Stable'
        return f"{obj.drift_severity.capitalize()} Drift"


class PerformanceMetricsSerializer(serializers.Serializer):
    """
    Serializer for real-time performance metrics.
    Used for the summary cards and dashboard.
    """
    total_predictions = serializers.IntegerField()
    correct_predictions = serializers.IntegerField()
    accuracy = serializers.FloatField()
    precision = serializers.FloatField()
    recall = serializers.FloatField()
    f1_score = serializers.FloatField()
    balanced_accuracy = serializers.FloatField()
    recent_accuracy = serializers.FloatField(required=False)
    
    # Confusion matrix
    true_positives = serializers.IntegerField()
    false_positives = serializers.IntegerField()
    true_negatives = serializers.IntegerField()
    false_negatives = serializers.IntegerField()
    
    # Per-symbol breakdown
    by_symbol = serializers.DictField(required=False)


class DriftDetectionSerializer(serializers.Serializer):
    """
    Serializer for drift detection results.
    """
    drift_detected = serializers.BooleanField()
    severity = serializers.CharField()
    recent_f1 = serializers.FloatField()
    baseline_f1 = serializers.FloatField()
    drop_percent = serializers.FloatField()
    recent_metrics = serializers.DictField()
    baseline_metrics = serializers.DictField()


class SHAPExplanationSerializer(serializers.Serializer):
    """
    Serializer for SHAP explanations per prediction.
    """
    prediction_id = serializers.IntegerField()
    shap_values = serializers.DictField()
    feature_importance = serializers.DictField()
    explanation = serializers.CharField()
    top_features = serializers.ListField(
        child=serializers.DictField()
    )