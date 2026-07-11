from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
from .opinion_generator import generate_stock_opinion, format_investment_analysis
from .models import Prediction
from .serializers import PredictionSerializer, StockOpinionSerializer

logger = logging.getLogger(__name__)

class StockOpinionView(APIView):
    """
    API endpoint to generate an AI stock opinion.
    Accepts query parameters:
      - symbol: Stock ticker (required)
      - risk_type: "high", "medium", "low" (default "medium")
      - hold_time: "long-term", "short-term", "medium-term" (default "medium-term")
      - detail_level: "detailed" or "summary" (default "summary")
    """
    def get(self, request, *args, **kwargs):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                {"error": "Stock symbol is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        risk_type = request.query_params.get("risk_type", "medium")
        hold_time = request.query_params.get("hold_time", "medium-term")
        detail_level = request.query_params.get("detail_level", "summary")
        
        try:
            # Generate stock opinion
            opinion = generate_stock_opinion(
                symbol=symbol,
                risk_type=risk_type
            )
            
            # Check if opinion generation returned an error
            if "error" in opinion:
                return Response(opinion, status=status.HTTP_400_BAD_REQUEST)
            
            # Format the analysis
            formatted_opinion = format_investment_analysis(opinion)
            
            # Add hold_time and detail_level to response
            formatted_opinion['hold_time'] = hold_time
            formatted_opinion['detail_level'] = detail_level
            
            # Optionally format as text
            if request.query_params.get("format", "json").lower() == "text":
                text_response = self._format_as_text(formatted_opinion)
                return Response({"analysis_text": text_response}, status=status.HTTP_200_OK)
            
            return Response(formatted_opinion, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception(f"Error generating stock opinion for {symbol}: {str(e)}")
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _format_as_text(self, opinion: dict) -> str:
        """Format opinion as readable text"""
        lines = [
            f"Stock Analysis for {opinion.get('symbol', 'Unknown')}",
            f"=" * 40,
            f"Recommendation: {opinion.get('analysis', {}).get('recommendation', 'N/A')}",
            f"Confidence: {opinion.get('analysis', {}).get('confidence', 0)}%",
            f"Current Price: ${opinion.get('analysis', {}).get('current_price', 0)}",
            f"\nSummary:",
            f"{opinion.get('summary', 'No summary available')}",
            f"\nInvestment Thesis:",
            f"{opinion.get('analysis', {}).get('investment_thesis', 'No thesis available')}",
        ]
        return "\n".join(lines)

class PredictionHistoryView(APIView):
    """
    API endpoint to retrieve prediction history.
    """
    def get(self, request):
        try:
            # Get query parameters for filtering
            symbol = request.query_params.get('symbol')
            limit = int(request.query_params.get('limit', 100))
            
            # Build queryset
            queryset = Prediction.objects.all().order_by('-date')
            
            if symbol:
                queryset = queryset.filter(stock_symbol=symbol.upper())
            
            # Limit results
            queryset = queryset[:min(limit, 500)]  # Max 500 records
            
            serializer = PredictionSerializer(queryset, many=True)
            
            data = serializer.data
            return Response({"success": True, "count": len(data), "results": data}, status=200)
            
        except Exception as e:
            logger.exception(f"Error fetching prediction history: {e}")
            return Response(
                {"error": "Internal server error", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )