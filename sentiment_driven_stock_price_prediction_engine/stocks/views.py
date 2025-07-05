from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
from .opinion_generator import generate_stock_opinion_sync, format_investment_analysis


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
            # For synchronous processing (for demonstration)
            opinion = generate_stock_opinion_sync(
                symbol=symbol,
                risk_type=risk_type,
                hold_time=hold_time,
                detail_level=detail_level.lower()
            )
            # Optionally, you could format the output as text if requested:
            if request.query_params.get("format", "json").lower() == "text":
                # For demonstration, we use the company symbol as company name
                formatted_text = format_investment_analysis(opinion, company_name=symbol, detail_level=detail_level, hold_time=hold_time)
                return Response({"analysis_text": formatted_text}, status=status.HTTP_200_OK)
            return Response(opinion, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error generating stock opinion: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class PredictionHistoryView(APIView):
    def get(self, request):
        queryset = Prediction.objects.all().order_by('-date')
        serializer = PredictionSerializer(queryset, many=True)
        return Response(serializer.data)