from rest_framework import serializers
from .models import StockData

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockData
        fields = '__all__'
