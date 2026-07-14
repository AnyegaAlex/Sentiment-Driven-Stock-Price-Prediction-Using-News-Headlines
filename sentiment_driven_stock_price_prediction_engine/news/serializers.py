from rest_framework import serializers
from .models import ProcessedNews

class ProcessedNewsSerializer(serializers.ModelSerializer):
    source = serializers.CharField(read_only=True)

    class Meta:
        model = ProcessedNews
        fields = [
            'id',
            'symbol',
            'title',
            'summary',
            'source',          # Frontend expects 'source'
            'url',
            'published_at',
            'sentiment',
            'confidence',
            'sentiment_score',
            'key_phrases',
            'source_reliability',
            'banner_image_url',
            'raw_data',
        ]
        read_only_fields = fields