from rest_framework import serializers
from .models import ProcessedNews  # Changed from NewsArticle to match our model

class ProcessedNewsSerializer(serializers.ModelSerializer):
    # Changed field name to match  model's confidence field
    confidence = serializers.FloatField(source='confidence', read_only=True)
    
    # Added fields for symbol, title, summary, source, url, published_at, sentiment, confidence, and raw_data
    symbol = serializers.CharField(read_only=True)

    class Meta:
        model = ProcessedNews  # Matches our model from tasks.py implementation
        fields = [
            'id',
            'symbol',  # Direct field from your ProcessedNews model
            'title',
            'summary',  # Matches model field name (not description)
            'source',
            'url',
            'published_at',
            'sentiment',
            'confidence',  # Renamed from sentiment_score to match model
            'raw_data'  # Consider excluding if not needed in frontend
        ]
        read_only_fields = ['sentiment', 'confidence']
