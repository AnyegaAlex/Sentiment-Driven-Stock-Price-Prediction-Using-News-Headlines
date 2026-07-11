from rest_framework import serializers
from .models import StockOpinion, Prediction

class StockOpinionSerializer(serializers.ModelSerializer):
    """Serializer for StockOpinion model"""
    class Meta:
        model = StockOpinion
        fields = '__all__'
        read_only_fields = ['timestamp']

class PredictionSerializer(serializers.ModelSerializer):
    """Serializer for Prediction model"""
    class Meta:
        model = Prediction
        fields = '__all__'
        read_only_fields = ['created_at']