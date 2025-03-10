from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
from .opinion_generator import generate_stock_opinion

logger = logging.getLogger(__name__)
class StockOpinionView(APIView):
    """
    API endpoint to generate an AI stock opinion.
    Accepts query parameters:
      - symbol: Stock ticker (required)
      - detailed: "true" or "false" (optional, default false)
      - risk_type: "low", "medium", or "high" (optional, default "medium")
      - hold_time: "short-term", "medium-term", or "long-term" (optional, default "medium-term")
    """
    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                {"error": "Stock symbol is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detailed = request.query_params.get("detailed", "false").lower() == "true"
        risk_type = request.query_params.get("risk_type", "medium")
        hold_time = request.query_params.get("hold_time", "medium-term")

        try:
            opinion = generate_stock_opinion(symbol, detailed, risk_type, hold_time)
            return Response(opinion, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error generating stock opinion: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )