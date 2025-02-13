# sentiment_driven_stock_price_prediction_engine/stocks/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .tasks import analyze_sentiment  # Ensure this import is correct

class StockPredictionView(APIView):
    def post(self, request):
        """
        Handle POST requests for stock sentiment analysis.
        """
        text = request.data.get('text', '')
        if not text:
            return Response(
                {"error": "Text is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use Celery task for sentiment analysis
        result = analyze_sentiment.delay(text)
        
        # Wait for the Celery task to complete (optional, can be async)
        sentiment, confidence = result.get()
        
        return Response({
            "sentiment": sentiment,
            "confidence": confidence
        }, status=status.HTTP_200_OK)