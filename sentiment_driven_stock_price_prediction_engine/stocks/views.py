"""
Stock analysis views – unified dashboard, technical indicators, LSTM predictions,
subscription, and history. All endpoints are documented via OpenAPI (Swagger).

ARCHITECTURE NOTE:
This module is designed to be LIGHTWEIGHT. It serves as a pure API layer.
All heavy lifting (Machine Learning inference, yfinance scraping, external API calls) 
is handled asynchronously by the GitHub Actions Data Pipeline. 
These views ONLY read from the database and Redis cache.
"""

import logging
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from rest_framework import status, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes

from drf_spectacular.utils import (
    extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
)

# Project imports
from news.models import ProcessedNews
from authentication.utils import error_response, success_response
from .models import Prediction, Subscription
from .serializers import (
    PredictionSerializer,
    PredictionDetailSerializer,
    StockOpinionSerializer,
    SubscriptionSerializer,
    TechnicalIndicatorsSerializer,
    SymbolSerializer,
)
from .utils import calculate_performance_metrics, detect_drift

User = get_user_model()
logger = logging.getLogger(__name__)

# ============================================================================
#  CONSOLIDATED FALLBACK DATA
# ============================================================================
FALLBACK_DATA = {
    "AAPL": {"company": "Apple Inc.", "price": 116.16, "sma50": 114.84, "sma200": 111.81, "rsi": 70.8, "support": 110.35, "resistance": 121.97, "volume": 12424000, "volatility": 0.15},
    "MSFT": {"company": "Microsoft Corp.", "price": 420.50, "sma50": 418.20, "sma200": 410.00, "rsi": 65.0, "support": 400.0, "resistance": 430.0, "volume": 8000000, "volatility": 0.12},
    "NVDA": {"company": "NVIDIA Corp.", "price": 130.00, "sma50": 128.50, "sma200": 125.00, "rsi": 60.0, "support": 120.0, "resistance": 140.0, "volume": 15000000, "volatility": 0.25},
    "GOOGL": {"company": "Alphabet Inc.", "price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 58.0, "support": 170.0, "resistance": 190.0, "volume": 5000000, "volatility": 0.10},
    "AMZN": {"company": "Amazon.com Inc.", "price": 190.00, "sma50": 188.00, "sma200": 185.00, "rsi": 55.0, "support": 180.0, "resistance": 200.0, "volume": 6000000, "volatility": 0.18},
    "META": {"company": "Meta Platforms Inc.", "price": 510.00, "sma50": 505.00, "sma200": 500.00, "rsi": 62.0, "support": 490.0, "resistance": 520.0, "volume": 4000000, "volatility": 0.14},
    "TSLA": {"company": "Tesla Inc.", "price": 250.00, "sma50": 245.00, "sma200": 240.00, "rsi": 70.0, "support": 230.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.35},
    "JPM": {"company": "JPMorgan Chase", "price": 160.00, "sma50": 158.00, "sma200": 155.00, "rsi": 50.0, "support": 150.0, "resistance": 170.0, "volume": 2000000, "volatility": 0.08},
    "IBM": {"company": "International Business Machines", "price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 52.0, "support": 170.0, "resistance": 190.0, "volume": 1500000, "volatility": 0.09},
    "PLTR": {"company": "Palantir Technologies", "price": 132.38, "sma50": 132.48, "sma200": 155.64, "rsi": 53.0, "support": 120.0, "resistance": 145.0, "volume": 31841300, "volatility": 1.8},
    "NFLX": {"company": "Netflix Inc.", "price": 620.00, "sma50": 615.00, "sma200": 600.00, "rsi": 65.0, "support": 590.0, "resistance": 650.0, "volume": 2000000, "volatility": 0.20},
    "VTI": {"company": "Vanguard Total Stock Market", "price": 250.00, "sma50": 248.00, "sma200": 245.00, "rsi": 55.0, "support": 240.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.12},
}

# ============================================================================
#  HELPERS: FALLBACKS & CACHE
# ============================================================================

def get_fallback_technical(symbol: str) -> dict:
    """
    Generate realistic fallback technical data.
    Used when the cache is cold or the background pipeline hasn't run yet.
    """
    symbol = symbol.upper()
    
    if symbol in FALLBACK_DATA:
        data = FALLBACK_DATA[symbol]
        price = data["price"]
        
        random.seed(hash(symbol) % 2**32)  # deterministic per symbol
        price_history = []
        for i in range(30):
            change = (random.random() - 0.5) * 0.02
            if i == 0:
                price_history.append(round(price * (1 - 0.02), 2))
            else:
                prev = price_history[-1]
                new_price = prev * (1 + change)
                price_history.append(round(new_price, 2))
        price_history[-1] = round(price, 2)

        return {
            "technical": {
                "current_price": price,
                "sma_50": data["sma50"],
                "sma_200": data["sma200"],
                "rsi": data["rsi"],
                "support": data["support"],
                "resistance": data["resistance"],
                "pivot": (price + data["support"] + data["resistance"]) / 3,
                "volume": data["volume"],
                "volatility": data["volatility"],
                "price_history": price_history,
            }
        }

    # Dynamic fallback for unknown symbols
    random.seed(hash(symbol) % 2**32)
    price = round(random.uniform(20, 500), 2)
    sma50 = round(price * (1 + random.uniform(-0.05, 0.05)), 2)
    sma200 = round(price * (1 + random.uniform(-0.10, 0.10)), 2)
    
    return {
        "technical": {
            "current_price": price,
            "sma_50": sma50,
            "sma_200": sma200,
            "rsi": round(random.uniform(30, 70), 1),
            "support": round(price * 0.9, 2),
            "resistance": round(price * 1.1, 2),
            "pivot": round(price, 2),
            "volume": random.randint(1000000, 50000000),
            "volatility": round(random.uniform(0.05, 0.35), 2),
            "price_history": [round(price * (1 + (random.random() - 0.5) * 0.05), 2) for _ in range(30)],
        }
    }

def get_technical_indicators(symbol: str, timeframe: str = "1d") -> dict:
    """
    Retrieves technical indicators.
    Priority: Redis Cache -> Fallback Data.
    NEVER calls yfinance synchronously.
    """
    cache_key = f"tech_{symbol}_{timeframe}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Cache miss: use fallback and populate cache so background workers can override later
    fallback_data = get_fallback_technical(symbol)
    data = fallback_data.get("technical")
    
    if data:
        cache.set(cache_key, data, timeout=300)
    return data

def get_sentiment_summary(symbol: str, days: int = 7) -> dict:
    """
    Fetch and summarise sentiment from recent news for a given symbol.
    Reads directly from the database (populated by the news pipeline).
    """
    cutoff = timezone.now() - timedelta(days=days)
    news_items = ProcessedNews.objects.filter(
        symbol=symbol.upper(),
        published_at__gte=cutoff
    ).order_by('-published_at')[:100]

    if not news_items.exists():
        return {
            "overall": "Neutral",
            "score": 0.0,
            "recent_articles": 0,
            "source_stats": {"tier1_count": 0, "reliability_sum": 0, "tier1_sources": []},
            "history": []
        }

    scores = [n.sentiment_score for n in news_items if n.sentiment_score is not None]
    valid_scores = [s for s in scores if s is not None]
    avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0
    label = "Bullish" if avg_score > 0.2 else "Bearish" if avg_score < -0.2 else "Neutral"

    reliable_sources = {'Reuters', 'Bloomberg', 'CNBC', 'Wall Street Journal', 'Financial Times'}
    tier1_sources = []
    reliability_sum = 0
    tier1_count = 0
    for item in news_items[:50]:
        source = item.source_name or item.provider or ''
        if source in reliable_sources:
            tier1_sources.append(source)
            tier1_count += 1
            reliability_sum += item.source_reliability or 70

    history = [
        {"date": item.published_at.isoformat(), "score": round(item.sentiment_score, 4)}
        for item in news_items[:min(days, len(news_items))]
        if item.sentiment_score is not None
    ]
    history.sort(key=lambda x: x['date'])

    return {
        "overall": label,
        "score": round(avg_score, 4),
        "recent_articles": len(news_items),
        "source_stats": {
            "tier1_count": tier1_count,
            "reliability_sum": round(reliability_sum, 1),
            "tier1_sources": list(set(tier1_sources))[:5]
        },
        "history": history[-30:]
    }


# ============================================================================
#  INLINE SERIALIZERS FOR SWAGGER
# ============================================================================

class SentimentSummarySerializer(serializers.Serializer):
    overall = serializers.CharField()
    score = serializers.FloatField()
    recent_articles = serializers.IntegerField()

class TechnicalIndicatorsResponseSerializer(serializers.Serializer):
    currentPrice = serializers.FloatField()
    sma50 = serializers.FloatField()
    sma200 = serializers.FloatField()
    rsi = serializers.FloatField()
    support = serializers.FloatField()
    resistance = serializers.FloatField()
    volume = serializers.IntegerField()

class PriceTargetsSerializer(serializers.Serializer):
    bearish = serializers.FloatField()
    base = serializers.FloatField()
    bullish = serializers.FloatField()

class KeyFactorSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField()
    impact = serializers.CharField()

class RiskAssessmentSerializer(serializers.Serializer):
    level = serializers.CharField()
    horizon = serializers.CharField()

class StockAnalysisResponseSerializer(serializers.Serializer):
    company = serializers.CharField()
    symbol = serializers.CharField()
    recommendation = serializers.CharField()
    confidence = serializers.FloatField()
    sentiment = SentimentSummarySerializer()
    lastUpdated = serializers.CharField()
    technicalIndicators = TechnicalIndicatorsResponseSerializer()
    priceTargets = PriceTargetsSerializer()
    keyFactors = KeyFactorSerializer(many=True)
    riskAssessment = RiskAssessmentSerializer()
    lstm_prediction = serializers.DictField(required=False)

class LSTMPredictionResponseSerializer(serializers.Serializer):
    symbol = serializers.CharField()
    prediction = serializers.CharField()
    confidence = serializers.FloatField()
    sentiment_score = serializers.FloatField()
    timestamp = serializers.CharField()
    success = serializers.BooleanField()


# ============================================================================
#  VIEWS
# ============================================================================

class StockOpinionView(APIView):
    """
    Legacy endpoint – kept for backward compatibility.
    Reads the latest generated opinion from the DB.
    """
    serializer_class = StockOpinionSerializer  
    @extend_schema(
        summary="Generate AI stock opinion (legacy)",
        description="Returns a full investment thesis including recommendation, key points, and risk assessment.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=True),
            OpenApiParameter(name='risk_type', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='medium'),
            OpenApiParameter(name='hold_time', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='medium-term'),
        ],
        responses={200: StockOpinionSerializer, 400: OpenApiResponse(description="Missing symbol")},
        tags=["Legacy"]
    )
    def get(self, request, *args, **kwargs):
        symbol = request.query_params.get("symbol", "").upper()
        if not symbol:
            return Response(error_response("Stock symbol is required.", code=2001), status=status.HTTP_400_BAD_REQUEST)

        # Fetch latest from DB
        latest_pred = Prediction.objects.filter(stock_symbol=symbol).order_by('-created_at').first()
        
        if not latest_pred:
            return Response(error_response(f"No analysis available for {symbol} yet.", code=4041), status=status.HTTP_404_NOT_FOUND)

        return Response({
            "symbol": symbol,
            "analysis": {
                "recommendation": latest_pred.predicted_movement.upper(),
                "confidence": latest_pred.confidence * 100,
                "current_price": float(latest_pred.price_at_prediction or 0.0),
            },
            "summary": latest_pred.prediction_explanation or "Analysis generated by background pipeline.",
            "status": "success"
        }, status=status.HTTP_200_OK)


class PredictionHistoryView(APIView):
    """
    Paginated prediction history with Redis caching.
    """
    serializer_class = PredictionSerializer  
    @extend_schema(
        summary="Get prediction history",
        description="Returns a paginated list of past predictions.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name='limit', type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, required=False, default=50),
            OpenApiParameter(name='offset', type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, required=False, default=0),
        ],
        responses={200: OpenApiResponse(description='Paginated list of predictions')},
        tags=["Prediction History"]
    )
    def get(self, request):
        try:
            symbol = request.query_params.get('symbol')
            limit = min(int(request.query_params.get('limit', 50)), 200)
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

            cache.set(cache_key, response_data, timeout=300)
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error fetching prediction history: {e}")
            return Response(error_response("Internal server error", code=9001), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StockAnalysisView(APIView):
    """
    Unified endpoint for the dashboard.
    Combines cached technicals, DB sentiment, and the latest LSTM prediction from the DB.
    """
    serializer_class = StockAnalysisResponseSerializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Unified stock analysis",
        description="Comprehensive analysis: recommendation, sentiment summary, technical indicators, price targets, and latest LSTM prediction.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=True),
            OpenApiParameter(name='risk_type', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='medium'),
            OpenApiParameter(name='hold_time', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='medium-term'),
        ],
        responses={200: StockAnalysisResponseSerializer, 400: OpenApiResponse(description="Missing symbol")},
        tags=["Stock Analysis"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol", "").upper()
        if not symbol:
            return Response(error_response("Stock symbol is required.", code=2001), status=status.HTTP_400_BAD_REQUEST)

        risk_type = request.query_params.get("risk_type", "medium")
        hold_time = request.query_params.get("hold_time", "medium-term")
        cache_key = f"stock_analysis_{symbol}_{risk_type}_{hold_time}"

        # 1. Try Cache
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(success_response(data=cached_response), status=status.HTTP_200_OK)

        # 2. Build from DB / Fallback
        try:
            # Fetch latest LSTM prediction from DB
            latest_pred = Prediction.objects.filter(stock_symbol=symbol).order_by('-created_at').first()
            
            # Fetch sentiment from News DB
            sentiment_summary = get_sentiment_summary(symbol, days=7)
            
            # Fetch Technicals (from cache/fallback)
            tech_data = get_technical_indicators(symbol)

            # Format LSTM data
            lstm_data = {
                "direction": latest_pred.predicted_movement.upper() if latest_pred else "UNAVAILABLE",
                "confidence": (latest_pred.confidence * 100) if latest_pred else 0.0,
                "fallback": not bool(latest_pred),
                "message": "Loaded from background pipeline" if latest_pred else "No recent prediction available"
            }

            # Map company names
            company_name = FALLBACK_DATA.get(symbol, {}).get("company", f"{symbol} Inc.")

            response_data = {
                "company": company_name,
                "symbol": symbol,
                "recommendation": latest_pred.predicted_movement.upper() if latest_pred else "HOLD",
                "confidence": (latest_pred.confidence if latest_pred else 0.5),
                "sentiment": {
                    "overall": sentiment_summary["overall"],
                    "score": sentiment_summary["score"],
                    "recent_articles": sentiment_summary["recent_articles"],
                },
                "lastUpdated": timezone.now().isoformat() + 'Z',
                "technicalIndicators": {
                    "currentPrice": tech_data["current_price"],
                    "sma50": tech_data["sma_50"],
                    "sma200": tech_data["sma_200"],
                    "rsi": tech_data["rsi"],
                    "support": tech_data["support"],
                    "resistance": tech_data["resistance"],
                    "volume": tech_data["volume"],
                },
                "priceTargets": {
                    "bearish": round(tech_data["current_price"] * 0.9, 2),
                    "base": round(tech_data["current_price"], 2),
                    "bullish": round(tech_data["current_price"] * 1.14, 2),
                },
                "keyFactors": [{"title": "Market Sentiment", "description": "Based on recent news", "impact": "neutral"}],
                "riskAssessment": {"level": risk_type, "horizon": hold_time},
                "lstm_prediction": lstm_data
            }

            # Cache for 1 hour
            cache.set(cache_key, response_data, timeout=3600)
            return Response(success_response(data=response_data), status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to build analysis for {symbol}: {e}")
            # Safe fallback if DB fails
            return Response(error_response("Analysis temporarily unavailable.", code=5001), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TechnicalIndicatorsView(APIView):
    """
    Returns pure technical indicators.
    Prioritizes cache (populated by pipeline); uses fallback if cold.
    """
    serializer_class = TechnicalIndicatorsResponseSerializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get technical indicators",
        description="Returns technical metrics: SMA50, SMA200, RSI, support, resistance, pivot, volume, volatility, and price history.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=True),
            OpenApiParameter(name='timeframe', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='1d'),
        ],
        responses={200: TechnicalIndicatorsResponseSerializer, 400: OpenApiResponse(description="Missing symbol")},
        tags=["Technical Indicators"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol", "").upper()
        if not symbol:
            return Response(error_response("Symbol is required.", code=2001), status=status.HTTP_400_BAD_REQUEST)

        timeframe = request.query_params.get("timeframe", "1d")
        
        # get_technical_indicators handles cache and fallback internally now
        data = get_technical_indicators(symbol, timeframe)
        
        return Response(
            success_response(data={"technical": data}),
            status=status.HTTP_200_OK
        )


class SymbolsListView(APIView):
    """
    List available stock symbols.
    """
    serializer_class = SymbolSerializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="List available symbols",
        description="Returns a list of supported stock symbols with company names and regions.",
        responses={200: SymbolSerializer(many=True)},
        tags=["Symbols"]
    )
    def get(self, request):
        cache_key = "symbols_list"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        try:
            symbols_data = [
                {"symbol": sym, "name": data["company"], "region": "US"} 
                for sym, data in FALLBACK_DATA.items()
            ]
            serializer = SymbolSerializer(symbols_data, many=True)
            cache.set(cache_key, serializer.data, timeout=3600)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error fetching symbols list: {e}")
            return Response(error_response(f"Internal server error: {str(e)}", code=9001), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscribeView(APIView):
    """
    Email subscription for alerts.
    """
    serializer_class = SubscriptionSerializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Subscribe email",
        description="Add an email address to the subscription list.",
        request=SubscriptionSerializer,
        responses={
            201: OpenApiResponse(description="Subscribed successfully."),
            200: OpenApiResponse(description="Subscription reactivated."),
            400: OpenApiResponse(description="Invalid email or already active."),
        },
        tags=["Subscription"]
    )
    def post(self, request):
        serializer = SubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            obj, created = Subscription.objects.get_or_create(
                email=email,
                defaults={'is_active': True}
            )
            if created:
                return Response(success_response(message="Subscribed successfully."), status=status.HTTP_201_CREATED)
            
            if not obj.is_active:
                obj.is_active = True
                obj.save()
                return Response(success_response(message="Subscription reactivated."), status=status.HTTP_200_OK)
                
            return Response(error_response("Email already subscribed.", code=4002), status=status.HTTP_400_BAD_REQUEST)
            
        return Response(error_response("Validation failed", code=2001, errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)


class LSTMPredictionView(APIView):
    """
    LSTM prediction endpoint.
    Reads the latest prediction from the DB instead of running inference synchronously.
    """
    serializer_class = LSTMPredictionResponseSerializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="LSTM prediction",
        description="Returns a directional prediction (UP/DOWN) using the LSTM model.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=True),
        ],
        responses={200: LSTMPredictionResponseSerializer, 400: OpenApiResponse(description="Missing symbol")},
        tags=["LSTM"]
    )
    def get(self, request):
        symbol = request.query_params.get('symbol', "").upper()
        if not symbol:
            return Response(error_response("Symbol is required.", code=2001), status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"lstm_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        # Query the latest prediction from the DB
        latest_pred = Prediction.objects.filter(stock_symbol=symbol, source='lstm').order_by('-created_at').first()

        if not latest_pred:
            return Response(
                success_response(data={
                    "symbol": symbol,
                    "prediction": "HOLD",
                    "confidence": 50.0,
                    "sentiment_score": 0.0,
                    "timestamp": timezone.now().isoformat() + 'Z',
                    "success": True,
                    "message": "No recent LSTM prediction available. Using fallback."
                }), 
                status=status.HTTP_200_OK
            )

        result = {
            "symbol": symbol,
            "prediction": latest_pred.predicted_movement.upper(),
            "confidence": latest_pred.confidence * 100,
            "sentiment_score": latest_pred.sentiment_score,
            "timestamp": latest_pred.created_at.isoformat() + 'Z',
            "success": True
        }

        cache.set(cache_key, result, timeout=300)
        return Response(success_response(data=result), status=status.HTTP_200_OK)


class SentimentAnalysisView(APIView):
    """
    Dedicated sentiment analysis endpoint.
    Reads from the database.
    """
    serializer_class = serializers.Serializer  
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get sentiment analysis",
        description="Returns sentiment score, distribution, history, and news source statistics.",
        parameters=[
            OpenApiParameter(name='symbol', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=True),
            OpenApiParameter(name='time_range', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False, default='7d'),
        ],
        responses={200: OpenApiResponse(description='Sentiment analysis results'), 400: OpenApiResponse(description="Missing symbol")},
        tags=["Sentiment Analysis"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol", "").upper()
        if not symbol:
            return Response(error_response("Symbol is required.", code=2001), status=status.HTTP_400_BAD_REQUEST)

        time_range = request.query_params.get("time_range", "7d")
        days = 7 if time_range == '7d' else 30

        cache_key = f"sentiment_{symbol}_{time_range}"
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(success_response(data=cached_response), status=status.HTTP_200_OK)

        try:
            sentiment = get_sentiment_summary(symbol, days)

            response_data = {
                "sentiment": {
                    "score": sentiment['score'],
                    "label": sentiment['overall']
                },
                "news_count": sentiment['recent_articles'],
                "source_stats": sentiment['source_stats'],
                "history": sentiment['history']
            }

            cache.set(cache_key, response_data, timeout=600)
            return Response(success_response(data=response_data), status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error in SentimentAnalysisView for {symbol}: {e}")
            return Response(error_response("Sentiment analysis temporarily unavailable", code=5001), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictionListView(APIView):
    """
    List predictions with filters.
    """
    serializer_class = PredictionDetailSerializer  
    permission_classes = [AllowAny]

    def get(self, request):
        import dateutil.parser

        symbol = request.query_params.get('symbol')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        outcome = request.query_params.get('outcome')
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))

        qs = Prediction.objects.all().order_by('-date')

        if symbol:
            qs = qs.filter(stock_symbol=symbol.upper())

        if date_from and date_from not in ['null', 'undefined', '']:
            try:
                qs = qs.filter(date__gte=dateutil.parser.parse(date_from).date())
            except (ValueError, TypeError, OverflowError) as e:
                logger.warning(f"Failed to parse date_from: {date_from} - {e}")

        if date_to and date_to not in ['null', 'undefined', '']:
            try:
                qs = qs.filter(date__lte=dateutil.parser.parse(date_to).date())
            except (ValueError, TypeError, OverflowError) as e:
                logger.warning(f"Failed to parse date_to: {date_to} - {e}")

        if outcome == 'correct':
            qs = qs.filter(is_correct=True)
        elif outcome == 'incorrect':
            qs = qs.filter(is_correct=False)

        total = qs.count()
        qs = qs[offset:offset+limit]

        serializer = PredictionDetailSerializer(qs, many=True)
        return Response({
            'total': total,
            'results': serializer.data,
            'limit': limit,
            'offset': offset
        })


class PerformanceSummaryView(APIView):
    """
    Get overall performance metrics.
    """
    serializer_class = serializers.Serializer  
    permission_classes = [AllowAny]

    def get(self, request):
        symbol = request.query_params.get('symbol')
        days = int(request.query_params.get('days', 30))

        start_date = timezone.now() - timedelta(days=days)
        qs = Prediction.objects.filter(
            resolution_date__gte=start_date,
            is_correct__isnull=False
        )
        if symbol:
            qs = qs.filter(stock_symbol=symbol.upper())

        metrics = calculate_performance_metrics(qs)

        symbols = qs.values_list('stock_symbol', flat=True).distinct()
        symbol_metrics = {sym: calculate_performance_metrics(qs.filter(stock_symbol=sym)) for sym in symbols}

        total_preds = qs.count()
        correct_preds = qs.filter(is_correct=True).count()
        total_resolved = qs.filter(is_correct__isnull=False).count()

        recent_start = timezone.now() - timedelta(days=7)
        recent_metrics = calculate_performance_metrics(qs.filter(resolution_date__gte=recent_start))

        return Response({
            'total_predictions': total_preds,
            'resolved_predictions': total_resolved,
            'correct_predictions': correct_preds,
            'overall': metrics,
            'recent_accuracy': recent_metrics.get('accuracy', 0),
            'by_symbol': symbol_metrics
        })


class DriftDetectionView(APIView):
    """
    Detect model drift.
    """
    serializer_class = serializers.Serializer  
    permission_classes = [AllowAny]

    def get(self, request):
        recent_days = int(request.query_params.get('recent_days', 30))
        baseline_days = int(request.query_params.get('baseline_days', 90))

        result = detect_drift(recent_period_days=recent_days, baseline_period_days=baseline_days)
        return Response(result)


class SHAPExplanationView(APIView):
    """
    Get SHAP explanation for a specific prediction.
    """
    serializer_class = serializers.Serializer  
    permission_classes = [AllowAny]

    def get(self, request, prediction_id):
        try:
            pred = Prediction.objects.get(id=prediction_id)
            return Response({
                'id': pred.id,
                'stock_symbol': pred.stock_symbol,
                'date': pred.date,
                'predicted_movement': pred.predicted_movement,
                'shap_values': pred.shap_values or {},
                'feature_importance': pred.feature_importance or {},
                'explanation': pred.prediction_explanation or 'No explanation available',
                'is_correct': pred.is_correct,
                'confidence': pred.confidence,
            })
        except Prediction.DoesNotExist:
            return Response({'error': 'Prediction not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
#  DEPRECATED CRON ENDPOINT
# ============================================================================

@csrf_exempt
@require_http_methods(["GET", "POST"])
@api_view(['GET', 'POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def cron_resolve_predictions(request):
    """
    Deprecated: Prediction resolution is now handled by the GitHub Actions Data Pipeline.
    This endpoint returns a 410 Gone to prevent accidental API usage limits.
    """
    logger.warning("Deprecated cron_resolve_predictions endpoint was hit. Resolution is now handled by GitHub Actions.")
    return JsonResponse({
        'status': 'deprecated',
        'message': 'This endpoint is no longer active. Predictions are resolved automatically by the background pipeline.'
    }, status=410)