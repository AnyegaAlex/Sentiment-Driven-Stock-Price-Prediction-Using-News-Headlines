from rest_framework import serializers
from .models import ProcessedNews  # Changed from NewsArticle to match our model

class ProcessedNewsSerializer(serializers.ModelSerializer):
    # Changed field name to match  model's confidence field
    confidence = serializers.FloatField(source='confidence', read_only=True)
    
    # Added fields for symbol, title, summary, source, url, published_at, sentiment, confidence, and raw_data
    symbol = serializers.CharField(read_only=True)

    class Meta:
        model = ProcessedNews  
        fields = [
            'id',
            'symbol',  
            'title',
            'summary',  
            'source',
            'url',
            'published_at',
            'sentiment',
            'confidence',
            'banner_image_url',  
            'raw_data' 
        ]
        read_only_fields = ['sentiment', 'confidence']

def get_banner_image_url(self, obj):
        request = self.context.get("request")
        if obj.banner_image and hasattr(obj.banner_image, "url"):
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None