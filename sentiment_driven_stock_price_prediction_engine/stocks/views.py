from rest_framework.views import APIView
from rest_framework.response import Response
from .models import StockData
from .serializers import StockSerializer

class StockListView(APIView):
    def get(self, request):
        stocks = StockData.objects.all()
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data)
