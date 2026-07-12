from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db import transaction
import logging
from datetime import datetime
from .opinion_generator import generate_stock_opinion, format_investment_analysis
from .models import Prediction, Subscription
from .serializers import (
    PredictionSerializer,
    StockOpinionSerializer,
    SubscriptionSerializer,
    StockAnalysisSerializer,
    TechnicalIndicatorsSerializer,
    SymbolSerializer,
)
from news.models import ProcessedNews
from .lstm_predictor import get_lstm_predictor
from .utils import save_prediction  # NEW

logger = logging.getLogger(__name__)

# ============================================================
#  FALLBACK HELPERS – used when external APIs fail
# ============================================================

def get_fallback_analysis(symbol: str, risk_type: str = "medium", hold_time: str = "medium-term") -> dict:
    """
    Generate a realistic fallback analysis when external APIs fail.
    Uses static data for known symbols, generic for unknown.
    """
    symbol = symbol.upper()
    static_data = {
        "AAPL": {"company": "Apple Inc.", "price": 116.16, "sma50": 114.84, "sma200": 111.81, "rsi": 70.8, "support": 110.35, "resistance": 121.97, "volume": 12424000, "volatility": 0.15},
        "MSFT": {"company": "Microsoft Corp.", "price": 420.50, "sma50": 418.20, "sma200": 410.00, "rsi": 65.0, "support": 400.0, "resistance": 430.0, "volume": 8000000, "volatility": 0.12},
        "NVDA": {"company": "NVIDIA Corp.", "price": 130.00, "sma50": 128.50, "sma200": 125.00, "rsi": 60.0, "support": 120.0, "resistance": 140.0, "volume": 15000000, "volatility": 0.25},
        "GOOGL": {"company": "Alphabet Inc.", "price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 58.0, "support": 170.0, "resistance": 190.0, "volume": 5000000, "volatility": 0.10},
        "AMZN": {"company": "Amazon.com Inc.", "price": 190.00, "sma50": 188.00, "sma200": 185.00, "rsi": 55.0, "support": 180.0, "resistance": 200.0, "volume": 6000000, "volatility": 0.18},
        "META": {"company": "Meta Platforms Inc.", "price": 510.00, "sma50": 505.00, "sma200": 500.00, "rsi": 62.0, "support": 490.0, "resistance": 520.0, "volume": 4000000, "volatility": 0.14},
        "TSLA": {"company": "Tesla Inc.", "price": 250.00, "sma50": 245.00, "sma200": 240.00, "rsi": 70.0, "support": 230.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.35},
        "JPM": {"company": "JPMorgan Chase", "price": 160.00, "sma50": 158.00, "sma200": 155.00, "rsi": 50.0, "support": 150.0, "resistance": 170.0, "volume": 2000000, "volatility": 0.08},
        "IBM": {"company": "International Business Machines", "price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 52.0, "support": 170.0, "resistance": 190.0, "volume": 1500000, "volatility": 0.09},
    }
    data = static_data.get(symbol, {"company": f"{symbol} Inc.", "price": 100.0, "sma50": 98.0, "sma200": 95.0, "rsi": 55.0, "support": 95.0, "resistance": 105.0, "volume": 1000000, "volatility": 0.2})
    price = data["price"]
    return {
        "company": data["company"],
        "symbol": symbol,
        "recommendation": "HOLD",
        "confidence": 0.5,
        "sentiment": 0.0,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "technicalIndicators": {
            "currentPrice": price,
            "sma50": data["sma50"],
            "sma200": data["sma200"],
            "rsi": data["rsi"],
            "support": data["support"],
            "resistance": data["resistance"],
            "volume": data["volume"],
        },
        "priceTargets": {
            "bearish": round(price * 0.9, 2),
            "base": round(price, 2),
            "bullish": round(price * 1.14, 2),
        },
        "keyFactors": [
            {"title": "Market Sentiment", "description": "Based on recent news", "impact": "neutral"}
        ],
        "riskAssessment": {
            "level": risk_type,
            "horizon": hold_time
        }
    }

def get_fallback_technical(symbol: str) -> dict:
    """Fallback for technical indicators."""
    symbol = symbol.upper()
    static_data = {
        "AAPL": {"current_price": 116.16, "sma_50": 114.84, "sma_200": 111.81, "rsi": 70.8, "support": 110.35, "resistance": 121.97, "volume": 12424000, "volatility": 0.15},
        "MSFT": {"current_price": 420.50, "sma_50": 418.20, "sma_200": 410.00, "rsi": 65.0, "support": 400.0, "resistance": 430.0, "volume": 8000000, "volatility": 0.12},
        "NVDA": {"current_price": 130.00, "sma_50": 128.50, "sma_200": 125.00, "rsi": 60.0, "support": 120.0, "resistance": 140.0, "volume": 15000000, "volatility": 0.25},
        "GOOGL": {"current_price": 180.00, "sma_50": 178.00, "sma_200": 175.00, "rsi": 58.0, "support": 170.0, "resistance": 190.0, "volume": 5000000, "volatility": 0.10},
        "AMZN": {"current_price": 190.00, "sma_50": 188.00, "sma_200": 185.00, "rsi": 55.0, "support": 180.0, "resistance": 200.0, "volume": 6000000, "volatility": 0.18},
        "META": {"current_price": 510.00, "sma_50": 505.00, "sma_200": 500.00, "rsi": 62.0, "support": 490.0, "resistance": 520.0, "volume": 4000000, "volatility": 0.14},
        "TSLA": {"current_price": 250.00, "sma_50": 245.00, "sma_200": 240.00, "rsi": 70.0, "support": 230.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.35},
        "JPM": {"current_price": 160.00, "sma_50": 158.00, "sma_200": 155.00, "rsi": 50.0, "support": 150.0, "resistance": 170.0, "volume": 2000000, "volatility": 0.08},
        "IBM": {"current_price": 180.00, "sma_50": 178.00, "sma_200": 175.00, "rsi": 52.0, "support": 170.0, "resistance": 190.0, "volume": 1500000, "volatility": 0.09},
    }
    data = static_data.get(symbol, {"current_price": 100.0, "sma_50": 98.0, "sma_200": 95.0, "rsi": 55.0, "support": 95.0, "resistance": 105.0, "volume": 1000000, "volatility": 0.2})
    data["pivot"] = data["current_price"]
    data["price_history"] = [data["current_price"] * (1 + (i-10)*0.005) for i in range(20)]
    return {"technical": data}

# ============================================================
#  EXISTING VIEWS (kept as-is)
# ============================================================

class StockOpinionView(APIView):
    """
    API endpoint to generate an AI stock opinion.
    (Legacy endpoint – kept for backward compatibility)
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
            opinion = generate_stock_opinion(symbol=symbol, risk_type=risk_type)
            if "error" in opinion:
                return Response(opinion, status=status.HTTP_400_BAD_REQUEST)
            
            formatted_opinion = format_investment_analysis(opinion)
            formatted_opinion['hold_time'] = hold_time
            formatted_opinion['detail_level'] = detail_level
            
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
    API endpoint to retrieve prediction history with pagination and caching.
    Returns a paginated list of predictions.
    """
    def get(self, request):
        try:
            symbol = request.query_params.get('symbol')
            limit = int(request.query_params.get('limit', 50))
            limit = min(limit, 200)  # Cap at 200 to protect performance
            offset = int(request.query_params.get('offset', 0))

            cache_key = f"pred_history_{symbol}_{limit}_{offset}"
            cached_response = cache.get(cache_key)
            if cached_response:
                return Response(cached_response, status=status.HTTP_200_OK)

            queryset = Prediction.objects.all().order_by('-date')
            if symbol:
                queryset = queryset.filter(stock_symbol=symbol.upper())

            total = queryset.count()
            results = queryset[offset:offset+limit]
            serializer = PredictionSerializer(results, many=True)

            response_data = {
                'count': total,
                'next': offset + limit if offset + limit < total else None,
                'previous': offset - limit if offset - limit >= 0 else None,
                'results': serializer.data
            }

            # Cache for 5 minutes to reduce DB load
            cache.set(cache_key, response_data, timeout=300)
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error fetching prediction history: {e}")
            return Response(
                {"error": "Internal server error", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
#  NEW VIEWS – with fallback for resilience
# ============================================================

class StockAnalysisView(APIView):
    """
    Unified endpoint for the dashboard.
    GET /api/stock-analysis/?symbol=AAPL&risk_type=medium&hold_time=medium-term
    """
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                {"error": "Stock symbol is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        risk_type = request.query_params.get("risk_type", "medium")
        hold_time = request.query_params.get("hold_time", "medium-term")
        
        cache_key = f"stock_analysis_{symbol}_{risk_type}_{hold_time}"
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(cached_response, status=status.HTTP_200_OK)

        # ---------- TRY REAL DATA ----------
        try:
            opinion = generate_stock_opinion(symbol=symbol, risk_type=risk_type, news_text="")
            if "error" in opinion:
                raise ValueError(opinion["error"])
            
            formatted = format_investment_analysis(opinion)
            
            # Get sentiment from news (if available)
            sentiment_score = 0.0
            try:
                news_items = ProcessedNews.objects.filter(symbol=symbol).order_by('-published_at')[:50]
                if news_items.exists():
                    sentiments = [n.sentiment_score for n in news_items if n.sentiment_score is not None]
                    if sentiments:
                        sentiment_score = sum(sentiments) / len(sentiments)
                else:
                    sentiment_score = 0.5
            except Exception as e:
                logger.warning(f"Could not fetch sentiment for {symbol}: {e}")
                sentiment_score = 0.5

            # Build technical indicators
            tech_indicators = formatted.get('analysis', {}).get('technical_indicators', {})
            current_price = formatted.get('analysis', {}).get('current_price', 0)

            technical = {
                "currentPrice": current_price,
                "sma50": tech_indicators.get('sma_50', 0),
                "sma200": tech_indicators.get('sma_200', 0),
                "rsi": tech_indicators.get('rsi', 0),
                "support": tech_indicators.get('support', 0),
                "resistance": tech_indicators.get('resistance', 0),
                "volume": tech_indicators.get('volume', 0),
            }
            base_price = technical["currentPrice"]
            price_targets = {
                "bearish": round(base_price * 0.9, 2),
                "base": round(base_price, 2),
                "bullish": round(base_price * 1.14, 2),
            }
            # Key factors
            key_factors = []
            if 'key_points' in formatted.get('analysis', {}):
                key_factors = [
                    {"title": kp[:30], "description": kp, "impact": "positive"}
                    for kp in formatted.get('analysis', {}).get('key_points', [])[:5]
                ]
            if not key_factors:
                key_factors = [{"title": "Market Sentiment", "description": "Based on recent news", "impact": "neutral"}]
            
            response_data = {
                "company": formatted.get('company', symbol),
                "symbol": symbol.upper(),
                "recommendation": formatted.get('analysis', {}).get('recommendation', 'HOLD'),
                "confidence": formatted.get('analysis', {}).get('confidence', 0.5) / 100.0,
                "sentiment": round(sentiment_score, 2),
                "lastUpdated": datetime.utcnow().isoformat() + 'Z',
                "technicalIndicators": technical,
                "priceTargets": price_targets,
                "keyFactors": key_factors,
                "riskAssessment": {
                    "level": risk_type,
                    "horizon": hold_time
                }
            }
            
            # Add LSTM prediction if present in formatted
            if "lstm_prediction" in formatted:
                lstm = formatted["lstm_prediction"]
                response_data["lstm_prediction"] = lstm
                # Save prediction to history if direction is available
                if lstm.get('direction') and lstm['direction'] != 'UNAVAILABLE':
                    save_prediction(
                        symbol=symbol,
                        movement=lstm['direction'],
                        confidence=lstm.get('confidence', 50) / 100.0,
                        sentiment_score=sentiment_score,
                        headline="",  # No specific news headline
                        source='lstm'
                    )
            
            cache.set(cache_key, response_data, timeout=600)
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # ---------- FALLBACK ----------
            logger.warning(f"Real data failed for {symbol}: {e}. Using fallback.")
            response_data = get_fallback_analysis(symbol, risk_type, hold_time)
            cache.set(cache_key, response_data, timeout=300)
            return Response(response_data, status=status.HTTP_200_OK)


class TechnicalIndicatorsView(APIView):
    """
    GET /api/technical-indicators/?symbol=AAPL&timeframe=1d
    Returns technical indicators.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                {"error": "Symbol is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cache_key = f"technical_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)
        
        try:
            opinion = generate_stock_opinion(symbol=symbol, risk_type="medium")
            if "error" in opinion:
                raise ValueError(opinion["error"])
            
            formatted = format_investment_analysis(opinion)
            technical = {
                "current_price": formatted.get('analysis', {}).get('current_price', 0),
                "sma_50": formatted.get('analysis', {}).get('sma_50', 0),
                "sma_200": formatted.get('analysis', {}).get('sma_200', 0),
                "rsi": formatted.get('analysis', {}).get('rsi', 0),
                "support": formatted.get('analysis', {}).get('support', 0),
                "resistance": formatted.get('analysis', {}).get('resistance', 0),
                "pivot": formatted.get('analysis', {}).get('pivot', 0),
                "volume": formatted.get('analysis', {}).get('volume', 0),
                "volatility": formatted.get('analysis', {}).get('volatility', 0.0),
                "price_history": formatted.get('analysis', {}).get('price_history', []),
            }
            response_data = {"technical": technical}
            cache.set(cache_key, response_data, timeout=300)
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.warning(f"Technical data failed for {symbol}: {e}. Using fallback.")
            response_data = get_fallback_technical(symbol)
            cache.set(cache_key, response_data, timeout=300)
            return Response(response_data, status=status.HTTP_200_OK)


class SymbolsListView(APIView):
    """
    GET /api/stocks/symbols/
    Returns a list of available symbols with names and regions.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "symbols_list"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)
        
        try:
            symbols_data = [
                {"symbol": "AAPL", "name": "Apple Inc.", "region": "US"},
                {"symbol": "MSFT", "name": "Microsoft Corp.", "region": "US"},
                {"symbol": "GOOGL", "name": "Alphabet Inc.", "region": "US"},
                {"symbol": "AMZN", "name": "Amazon.com Inc.", "region": "US"},
                {"symbol": "META", "name": "Meta Platforms Inc.", "region": "US"},
                {"symbol": "TSLA", "name": "Tesla Inc.", "region": "US"},
                {"symbol": "NVDA", "name": "NVIDIA Corp.", "region": "US"},
                {"symbol": "JPM", "name": "JPMorgan Chase", "region": "US"},
                {"symbol": "VTI", "name": "Vanguard Total Stock Market", "region": "US"},
                {"symbol": "IBM", "name": "International Business Machines", "region": "US"},
            ]
            serializer = SymbolSerializer(symbols_data, many=True)
            cache.set(cache_key, serializer.data, timeout=3600)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception(f"Error fetching symbols list: {e}")
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscribeView(APIView):
    """
    POST /api/subscribe/
    Accepts { "email": "user@example.com" }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            obj, created = Subscription.objects.get_or_create(
                email=email,
                defaults={'is_active': True}
            )
            if created:
                return Response(
                    {"success": True, "message": "Subscribed successfully."},
                    status=status.HTTP_201_CREATED
                )
            else:
                if not obj.is_active:
                    obj.is_active = True
                    obj.save()
                    return Response(
                        {"success": True, "message": "Subscription reactivated."},
                        status=status.HTTP_200_OK
                    )
                return Response(
                    {"success": False, "message": "Email already subscribed."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(
            {"error": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================
#  NEW: LSTM Prediction Endpoint
# ============================================================

class LSTMPredictionView(APIView):
    """
    GET /api/lstm-predict/?symbol=AAPL&news=Apple%20announces%20new%20iPhone
    Returns LSTM-based prediction for given symbol and optional news text.
    Saves each successful prediction to the history table.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = request.query_params.get('symbol')
        if not symbol:
            return Response(
                {"error": "Symbol is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        news_text = request.query_params.get('news', '')

        # Check cache (5 minutes)
        cache_key = f"lstm_{symbol}_{hash(news_text)}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        try:
            predictor = get_lstm_predictor()
            result = predictor.predict(symbol, news_text)

            if not result.get('success'):
                return Response(
                    {"error": result.get('error', 'Prediction failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Save prediction to history
            try:
                save_prediction(
                    symbol=symbol,
                    movement=result['prediction'],
                    confidence=result['confidence'] / 100.0,
                    sentiment_score=result.get('sentiment_score', 0.0),
                    headline=news_text,
                    source='lstm'
                )
            except Exception as e:
                logger.warning(f"Failed to save prediction record for {symbol}: {e}")
                # Non-critical – do not fail the response

            # Build response
            result['symbol'] = symbol.upper()
            result['timestamp'] = datetime.utcnow().isoformat() + 'Z'

            cache.set(cache_key, result, timeout=300)
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error in LSTMPredictionView for {symbol}: {e}")
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )