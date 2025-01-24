from rest_framework.views import APIView
from rest_framework.response import Response
from .models import StockData
from .serializers import StockSerializer

class StockListView(APIView):
    def get(self, request, symbol):  # Ensure symbol is a parameter
        stocks = StockData.objects.filter(symbol=symbol)  # Use symbol instead of ticker
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data)