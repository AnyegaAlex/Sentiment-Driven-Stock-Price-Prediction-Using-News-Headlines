from rest_framework import serializers
from .models import NewsArticle

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsArticle
        fields = '__all__'
