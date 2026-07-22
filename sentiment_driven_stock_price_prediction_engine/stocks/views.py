"""
Stock analysis views – unified dashboard, technical indicators, LSTM predictions,
subscription, and history. All endpoints are documented via OpenAPI (Swagger).
"""
import yfinance as yf
import numpy as np
import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db import transaction
import logging
from datetime import datetime
from authentication.utils import error_response, success_response
from datetime import datetime, timedelta
from django.utils import timezone  

# drf-spectacular for OpenAPI
from drf_spectacular.utils import (
    extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
)

# Project imports
from .models import Prediction, Subscription
from .serializers import (
    PredictionSerializer,
    PredictionDetailSerializer,
    PredictionListSerializer,
    ModelPerformanceSnapshotSerializer,
    StockOpinionSerializer,
    SubscriptionSerializer,
    StockAnalysisSerializer,
    TechnicalIndicatorsSerializer,
    SymbolSerializer,
)
from news.models import ProcessedNews
from .lstm_predictor import get_lstm_predictor
from .utils import save_prediction, calculate_performance_metrics, detect_drift

logger = logging.getLogger(__name__)

def calculate_technical_indicators(symbol):
    """
    Fetch real technical indicators using yfinance.
    Returns dict with all fields, or None if data unavailable.
    If SMA_50 or SMA_200 cannot be computed (insufficient data), 
    they are approximated from the available history.
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6mo")  # enough for 200-day SMA
        if hist.empty or len(hist) < 10:
            return None

        current_price = float(hist['Close'].iloc[-1])
        price_history = [round(float(p), 2) for p in hist['Close'].tolist()]

        # SMA 50 – if data insufficient, compute SMA of all available data
        if len(hist) >= 50:
            sma_50 = float(hist['Close'].rolling(window=50).mean().iloc[-1])
            if np.isnan(sma_50):
                sma_50 = float(hist['Close'].mean())
        else:
            sma_50 = float(hist['Close'].mean())

        # SMA 200 – if data insufficient, compute SMA of all available data
        if len(hist) >= 200:
            sma_200 = float(hist['Close'].rolling(window=200).mean().iloc[-1])
            if np.isnan(sma_200):
                sma_200 = float(hist['Close'].mean())
        else:
            sma_200 = float(hist['Close'].mean())

        # RSI (14-day) – if insufficient data, fallback to 50
        if len(hist) >= 15:
            delta = hist['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = float(100 - (100 / (1 + rs.iloc[-1]))) if rs.iloc[-1] != 0 else 50.0
            if np.isnan(rsi):
                rsi = 50.0
        else:
            rsi = 50.0

        # Support / Resistance (20-day high/low)
        recent = hist.tail(20)
        support = float(recent['Low'].min()) if not recent.empty else current_price * 0.9
        resistance = float(recent['High'].max()) if not recent.empty else current_price * 1.1

        # Pivot Point
        pivot = float((recent['High'].iloc[-1] + recent['Low'].iloc[-1] + current_price) / 3) if not recent.empty else current_price

        # Volume
        volume = int(hist['Volume'].iloc[-1]) if not hist.empty else 0

        # Volatility (daily returns std dev)
        returns = hist['Close'].pct_change().dropna()
        volatility = float(returns.std() * 100) if len(returns) > 1 else 0.0
        if np.isnan(volatility):
            volatility = 0.0

        return {
            "current_price": current_price,
            "sma_50": round(sma_50, 2),
            "sma_200": round(sma_200, 2),
            "rsi": round(rsi, 1),
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "pivot": round(pivot, 2),
            "volume": volume,
            "volatility": round(volatility, 2),
            "price_history": price_history,
        }
    except Exception as e:
        logger.warning(f"yfinance failed for {symbol}: {e}")
        return None

# ============================================================
#  FALLBACK HELPERS (unchanged – kept for resilience)
# ============================================================
def get_fallback_analysis(symbol: str, risk_type: str = "medium", hold_time: str = "medium-term") -> dict:
    """Generate realistic fallback when external APIs fail."""
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
    fallback_sentiment = {"overall": "Neutral", "score": 0.5, "recent_articles": 0}
    return {
        "company": data["company"],
        "symbol": symbol,
        "recommendation": "HOLD",
        "confidence": 0.5,
        "sentiment": fallback_sentiment,
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
        "riskAssessment": {"level": risk_type, "horizon": hold_time}
    }

def get_fallback_technical(symbol: str) -> dict:
    """
    Generate realistic fallback technical data when yfinance fails.
    Uses a static map for well‑known symbols, and a dynamic generator for others.

    Args:
        symbol (str): Stock ticker.

    Returns:
        dict: A dictionary with a 'technical' key containing all required fields.
    """
    symbol = symbol.upper()

    # Static data for popular symbols (optional, but gives better fallback values)
    STATIC_DATA = {
        "AAPL": {"price": 116.16, "sma50": 114.84, "sma200": 111.81, "rsi": 70.8, "support": 110.35, "resistance": 121.97, "volume": 12424000, "volatility": 0.15},
        "MSFT": {"price": 420.50, "sma50": 418.20, "sma200": 410.00, "rsi": 65.0, "support": 400.0, "resistance": 430.0, "volume": 8000000, "volatility": 0.12},
        "NVDA": {"price": 130.00, "sma50": 128.50, "sma200": 125.00, "rsi": 60.0, "support": 120.0, "resistance": 140.0, "volume": 15000000, "volatility": 0.25},
        "GOOGL": {"price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 58.0, "support": 170.0, "resistance": 190.0, "volume": 5000000, "volatility": 0.10},
        "AMZN": {"price": 190.00, "sma50": 188.00, "sma200": 185.00, "rsi": 55.0, "support": 180.0, "resistance": 200.0, "volume": 6000000, "volatility": 0.18},
        "META": {"price": 510.00, "sma50": 505.00, "sma200": 500.00, "rsi": 62.0, "support": 490.0, "resistance": 520.0, "volume": 4000000, "volatility": 0.14},
        "TSLA": {"price": 250.00, "sma50": 245.00, "sma200": 240.00, "rsi": 70.0, "support": 230.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.35},
        "JPM": {"price": 160.00, "sma50": 158.00, "sma200": 155.00, "rsi": 50.0, "support": 150.0, "resistance": 170.0, "volume": 2000000, "volatility": 0.08},
        "IBM": {"price": 180.00, "sma50": 178.00, "sma200": 175.00, "rsi": 52.0, "support": 170.0, "resistance": 190.0, "volume": 1500000, "volatility": 0.09},
        "PLTR": {"price": 132.38, "sma50": 132.48, "sma200": 155.64, "rsi": 53.0, "support": 120.0, "resistance": 145.0, "volume": 31841300, "volatility": 1.8},
        "NFLX": {"price": 620.00, "sma50": 615.00, "sma200": 600.00, "rsi": 65.0, "support": 590.0, "resistance": 650.0, "volume": 2000000, "volatility": 0.20},
        "VTI": {"price": 250.00, "sma50": 248.00, "sma200": 245.00, "rsi": 55.0, "support": 240.0, "resistance": 260.0, "volume": 3000000, "volatility": 0.12},
    }

    # If symbol is in static map, use that data
    if symbol in STATIC_DATA:
        data = STATIC_DATA[symbol]
        price = data["price"]
        # Generate a 30-day price history around the current price
        import random
        random.seed(hash(symbol) % 2**32)  # deterministic per symbol
        base = price
        price_history = []
        for i in range(30):
            # Add random walk with small steps
            change = (random.random() - 0.5) * 0.02  # ±2% variation
            if i == 0:
                price_history.append(round(base * (1 - 0.02), 2))
            else:
                prev = price_history[-1]
                new_price = prev * (1 + change)
                price_history.append(round(new_price, 2))
        # Ensure the last value matches the current price
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

    # --- Dynamic fallback for unknown symbols ---
    # Use a reasonable default price (e.g., 100.0)
    base_price = 100.0
    # Add some variation based on symbol hash
    import random
    random.seed(hash(symbol) % 2**32)
    # Price between $20 and $500
    price = round(random.uniform(20, 500), 2)
    # SMAs: slightly above and below current price
    sma50 = round(price * (1 + random.uniform(-0.05, 0.05)), 2)
    sma200 = round(price * (1 + random.uniform(-0.10, 0.10)), 2)
    # RSI: between 30 and 70
    rsi = round(random.uniform(30, 70), 1)
    # Support/Resistance: 10-20% below/above current price
    support = round(price * (1 - random.uniform(0.05, 0.15)), 2)
    resistance = round(price * (1 + random.uniform(0.05, 0.15)), 2)
    pivot = round((price + support + resistance) / 3, 2)
    volume = random.randint(1000000, 50000000)
    volatility = round(random.uniform(0.05, 0.35), 2)

    # Generate 30-day price history with random walk
    price_history = []
    current = price * 0.95  # start slightly below
    for i in range(30):
        change = (random.random() - 0.5) * 0.025  # ±2.5% per day
        new_price = current * (1 + change)
        price_history.append(round(new_price, 2))
        current = new_price
    # Ensure last value is roughly the current price
    price_history[-1] = round(price, 2)

    return {
        "technical": {
            "current_price": price,
            "sma_50": sma50,
            "sma_200": sma200,
            "rsi": rsi,
            "support": support,
            "resistance": resistance,
            "pivot": pivot,
            "volume": volume,
            "volatility": volatility,
            "price_history": price_history,
        }
    }

# ============================================================
#  INLINE SERIALIZERS FOR SWAGGER RESPONSE SHAPES
# ============================================================
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

# ============================================================
#  VIEWS
# ============================================================

class StockOpinionView(APIView):
    """
    Legacy endpoint – kept for backward compatibility.
    Generates a detailed investment analysis.
    """
    @extend_schema(
        summary="Generate AI stock opinion (legacy)",
        description="Returns a full investment thesis including recommendation, key points, and risk assessment.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Stock ticker (e.g., AAPL)',
                required=True
            ),
            OpenApiParameter(
                name='risk_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Risk tolerance: low, medium, high',
                required=False,
                default='medium'
            ),
            OpenApiParameter(
                name='hold_time',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Investment horizon: short-term, medium-term, long-term',
                required=False,
                default='medium-term'
            ),
            OpenApiParameter(
                name='detail_level',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='summary or full',
                required=False,
                default='summary'
            ),
        ],
        responses={
            200: StockOpinionSerializer,
            400: OpenApiResponse(description="Missing symbol or invalid parameters"),
            500: OpenApiResponse(description="Internal server error"),
        },
        tags=["Legacy"]
    )
    def get(self, request, *args, **kwargs):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                error_response("Stock symbol is required.", code=2001),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        risk_type = request.query_params.get("risk_type", "medium")
        hold_time = request.query_params.get("hold_time", "medium-term")
        detail_level = request.query_params.get("detail_level", "summary")
        
        try:
            # ✅ Lazy import 
            from .opinion_generator import generate_stock_opinion, format_investment_analysis
            
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
                error_response(f"Internal server error: {str(e)}", code=9001),
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
    Paginated prediction history with Redis caching.
    """
    @extend_schema(
        summary="Get prediction history",
        description="Returns a paginated list of past predictions. Filter by symbol and control pagination.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by stock ticker',
                required=False
            ),
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Number of results per page (max 200)',
                required=False,
                default=50
            ),
            OpenApiParameter(
                name='offset',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Pagination offset',
                required=False,
                default=0
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=serializers.Serializer,
                description='Paginated list of predictions',
                examples=[
                    {
                        "application/json": {
                            "count": 125,
                            "next": 100,
                            "previous": 0,
                            "results": [
                                {
                                    "id": 1,
                                    "stock_symbol": "AAPL",
                                    "predicted_movement": "UP",
                                    "confidence": 0.82,
                                    "date": "2026-07-12T10:00:00Z"
                                }
                            ]
                        }
                    }
                ]
            ),
            500: OpenApiResponse(description="Internal server error"),
        },
        tags=["Prediction History"]
    )
    def get(self, request):
        try:
            symbol = request.query_params.get('symbol')
            limit = int(request.query_params.get('limit', 50))
            limit = min(limit, 200)
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
            return Response(
                error_response("Internal server error", code=9001, errors={"details": str(e)}),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StockAnalysisView(APIView):
    """
    Unified endpoint for the dashboard.
    Combines sentiment, technicals, price targets, and (optionally) LSTM.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Unified stock analysis",
        description="Comprehensive analysis: recommendation, sentiment summary, technical indicators, price targets, key factors, risk assessment, and LSTM prediction if available.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Stock ticker (e.g., AAPL)',
                required=True
            ),
            OpenApiParameter(
                name='risk_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Risk tolerance: low, medium, high',
                required=False,
                default='medium'
            ),
            OpenApiParameter(
                name='hold_time',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Investment horizon: short-term, medium-term, long-term',
                required=False,
                default='medium-term'
            ),
        ],
        responses={
            200: StockAnalysisResponseSerializer,
            400: OpenApiResponse(description="Missing symbol"),
            500: OpenApiResponse(description="Internal server error (fallback used)"),
        },
        tags=["Stock Analysis"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                error_response("Stock symbol is required.", code=2001),
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
            # ✅ Lazy import
            from .opinion_generator import generate_stock_opinion, format_investment_analysis
            
            opinion = generate_stock_opinion(symbol=symbol, risk_type=risk_type, news_text="")
            if "error" in opinion:
                raise ValueError(opinion["error"])
            
            formatted = format_investment_analysis(opinion)
            
            # ---------- BUILD SENTIMENT SUMMARY ----------
            sentiment_summary = {
                'overall': 'Neutral',
                'score': 0.0,
                'recent_articles': 0
            }
            try:
                news_items = ProcessedNews.objects.filter(symbol=symbol).order_by('-published_at')[:10]
                if news_items.exists():
                    scores = [n.sentiment_score for n in news_items if n.sentiment_score is not None]
                    if scores:
                        avg_score = sum(scores) / len(scores)
                        sentiment_summary['score'] = round(avg_score, 4)
                        if avg_score > 0.2:
                            sentiment_summary['overall'] = 'Bullish'
                        elif avg_score < -0.2:
                            sentiment_summary['overall'] = 'Bearish'
                        else:
                            sentiment_summary['overall'] = 'Neutral'
                        sentiment_summary['recent_articles'] = len(scores)
                    else:
                        sentiment_summary['score'] = 0.5
                else:
                    sentiment_summary['score'] = 0.5
            except Exception as e:
                logger.warning(f"Could not fetch sentiment for {symbol}: {e}")
                sentiment_summary['score'] = 0.5

            # ---------- FETCH TECHNICAL INDICATORS (using dedicated helper) ----------
            # Use the same logic as TechnicalIndicatorsView to ensure consistency
            tech_data = None
            try:
                # Try yfinance directly
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1mo")  # at least 20 days for support/resistance
                if not hist.empty and len(hist) >= 20:
                    current_price = float(hist['Close'].iloc[-1])
                    sma50 = float(hist['Close'].rolling(window=50).mean().iloc[-1]) if len(hist) >= 50 else 0.0
                    sma200 = float(hist['Close'].rolling(window=200).mean().iloc[-1]) if len(hist) >= 200 else 0.0
                    # RSI
                    delta = hist['Close'].diff()
                    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                    rs = gain / loss
                    rsi = float(100 - (100 / (1 + rs.iloc[-1]))) if rs.iloc[-1] != 0 else 50.0
                    support = float(hist['Low'].tail(20).min())
                    resistance = float(hist['High'].tail(20).max())
                    volume = int(hist['Volume'].iloc[-1])
                    tech_data = {
                        "currentPrice": current_price,
                        "sma50": sma50,
                        "sma200": sma200,
                        "rsi": rsi,
                        "support": support,
                        "resistance": resistance,
                        "volume": volume,
                    }
            except Exception as e:
                logger.warning(f"yfinance failed for technicals in StockAnalysisView: {e}")

            # If yfinance failed, use fallback
            if tech_data is None:
                fallback = get_fallback_technical(symbol)
                tech = fallback["technical"]
                tech_data = {
                    "currentPrice": tech["current_price"],
                    "sma50": tech["sma_50"],
                    "sma200": tech["sma_200"],
                    "rsi": tech["rsi"],
                    "support": tech["support"],
                    "resistance": tech["resistance"],
                    "volume": tech["volume"],
                }

            # Price targets (fallback if not present)
            price_targets = {
                "bearish": round(tech_data["currentPrice"] * 0.9, 2),
                "base": round(tech_data["currentPrice"], 2),
                "bullish": round(tech_data["currentPrice"] * 1.14, 2),
            }
            # If opinion provided targets, use them
            if formatted.get('analysis', {}).get('price_targets'):
                pt = formatted['analysis']['price_targets']
                price_targets = {
                    "bearish": pt.get('bearish', price_targets['bearish']),
                    "base": pt.get('base', price_targets['base']),
                    "bullish": pt.get('bullish', price_targets['bullish']),
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

            # Build response
            response_data = {
                "company": formatted.get('company', symbol),
                "symbol": symbol.upper(),
                "recommendation": formatted.get('analysis', {}).get('recommendation', 'HOLD'),
                "confidence": formatted.get('analysis', {}).get('confidence', 0.5) / 100.0,
                "sentiment": sentiment_summary,
                "lastUpdated": datetime.utcnow().isoformat() + 'Z',
                "technicalIndicators": tech_data,
                "priceTargets": price_targets,
                "keyFactors": key_factors,
                "riskAssessment": {
                    "level": risk_type,
                    "horizon": hold_time
                }
            }

            # ---------- LSTM PREDICTION ----------
            try:
                from .lstm_predictor import get_lstm_predictor
                predictor = get_lstm_predictor()
                lstm_result = predictor.predict(symbol)
                if lstm_result.get('success', False):
                    response_data["lstm_prediction"] = {
                        "direction": lstm_result.get('prediction', 'UNAVAILABLE'),
                        "confidence": lstm_result.get('confidence', 0.0),
                        "fallback": lstm_result.get('fallback', False),
                        "message": lstm_result.get('message', '')
                    }
                    # Save prediction to history if not fallback
                    if not lstm_result.get('fallback', True):
                        save_prediction(
                            symbol=symbol,
                            movement=lstm_result['prediction'],
                            confidence=lstm_result['confidence'] / 100.0,
                            sentiment_score=sentiment_summary['score'],
                            headline="",
                            source='lstm'
                        )
                else:
                    # If predictor returns success=False, still include a placeholder
                    response_data["lstm_prediction"] = {
                        "direction": "UNAVAILABLE",
                        "confidence": 0.0,
                        "error": lstm_result.get('error', 'LSTM prediction failed')
                    }
            except Exception as e:
                logger.error(f"LSTM prediction failed for {symbol}: {e}")
                response_data["lstm_prediction"] = {
                    "direction": "UNAVAILABLE",
                    "confidence": 0.0,
                    "error": str(e)
                }

            cache.set(cache_key, response_data, timeout=600)
            return Response(
                success_response(data=response_data),
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.warning(f"Real data failed for {symbol}: {e}. Using fallback.")
            # Full fallback using get_fallback_technical and opinion fallback
            fallback = get_fallback_analysis(symbol, risk_type, hold_time)
            # Ensure support/resistance are set
            tech_fallback = get_fallback_technical(symbol)
            if fallback.get('technicalIndicators'):
                fallback['technicalIndicators']['support'] = tech_fallback['technical']['support']
                fallback['technicalIndicators']['resistance'] = tech_fallback['technical']['resistance']
            cache.set(cache_key, fallback, timeout=300)
            return Response(
                success_response(data=fallback),
                status=status.HTTP_200_OK
            )

class TechnicalIndicatorsView(APIView):
    """
    Returns pure technical indicators (SMA, RSI, support, resistance, etc.).
    Uses yfinance for real data, with fallback to static data.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get technical indicators",
        description="Returns technical metrics: SMA50, SMA200, RSI, support, resistance, pivot, volume, volatility, and price history.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Stock ticker',
                required=True
            ),
            OpenApiParameter(
                name='timeframe',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Timeframe: 1d, 1w, 1m, 3m',
                required=False,
                default='1d'
            ),
        ],
        responses={
            200: TechnicalIndicatorsResponseSerializer,
            400: OpenApiResponse(description="Missing symbol"),
            500: OpenApiResponse(description="Internal server error (fallback used)"),
        },
        tags=["Technical Indicators"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                error_response("Symbol is required.", code=2001),
                status=status.HTTP_400_BAD_REQUEST
            )

        timeframe = request.query_params.get("timeframe", "1d")

        cache_key = f"technical_{symbol}_{timeframe}"
        cached = cache.get(cache_key)
        if cached:
            return Response(
                success_response(data=cached),
                status=status.HTTP_200_OK
            )

        # Try to get real data from yfinance
        try:
            # Map timeframe to days
            days_map = {
                '1d': 5,      # 5 days for 1D
                '1w': 7,
                '1m': 30,
                '3m': 90,
            }
            days = days_map.get(timeframe, 30)

            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=f"{days}d")

            if hist.empty:
                raise ValueError("No historical data returned from yfinance")

            # Current price
            current_price = float(hist['Close'].iloc[-1])

            # Price history
            price_history = [round(float(p), 2) for p in hist['Close'].tolist()]

            # SMAs
            sma_50 = 0
            sma_200 = 0
            if len(hist) >= 50:
                sma_50 = round(float(hist['Close'].rolling(window=50).mean().iloc[-1]), 2)
            if len(hist) >= 200:
                sma_200 = round(float(hist['Close'].rolling(window=200).mean().iloc[-1]), 2)

            # RSI (14-day)
            rsi = 0
            if len(hist) >= 15:
                delta = hist['Close'].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                rs = gain / loss
                rsi = round(100 - (100 / (1 + rs.iloc[-1])), 1) if rs.iloc[-1] != 0 else 50

            # Support & Resistance (20-day high/low)
            recent = hist.tail(20)
            support = round(float(recent['Low'].min()), 2) if not recent.empty else 0
            resistance = round(float(recent['High'].max()), 2) if not recent.empty else 0

            # Pivot Point (standard)
            last = hist.tail(1)
            pivot = round(float((last['High'].iloc[-1] + last['Low'].iloc[-1] + last['Close'].iloc[-1]) / 3), 2) if not last.empty else 0

            # Volume
            volume = int(hist['Volume'].iloc[-1]) if not hist.empty else 0

            # Volatility (daily returns std dev)
            returns = hist['Close'].pct_change().dropna()
            volatility = round(float(returns.std() * 100), 2) if len(returns) > 1 else 0

            response_data = {
                "technical": {
                    "current_price": current_price,
                    "sma_50": sma_50,
                    "sma_200": sma_200,
                    "rsi": rsi,
                    "support": support,
                    "resistance": resistance,
                    "pivot": pivot,
                    "volume": volume,
                    "volatility": volatility,
                    "price_history": price_history,
                }
            }
            cache.set(cache_key, response_data, timeout=300)
            return Response(
                success_response(data=response_data),
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.warning(f"yfinance failed for {symbol}: {e}. Using fallback.")
            response_data = get_fallback_technical(symbol)
            cache.set(cache_key, response_data, timeout=300)
            return Response(
                success_response(data=response_data),
                status=status.HTTP_200_OK
            )


class SymbolsListView(APIView):
    """
    List available stock symbols with company names and regions.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="List available symbols",
        description="Returns a list of supported stock symbols with company names and regions.",
        responses={
            200: SymbolSerializer(many=True),
            500: OpenApiResponse(description="Internal server error"),
        },
        tags=["Symbols"]
    )
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
                error_response(f"Internal server error: {str(e)}", code=9001),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscribeView(APIView):
    """
    Email subscription for alerts.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Subscribe email",
        description="Add an email address to the subscription list. Returns 201 if new, 200 if reactivated, 400 if already active.",
        request=SubscriptionSerializer,
        responses={
            201: OpenApiResponse(description="Subscribed successfully."),
            200: OpenApiResponse(description="Subscription reactivated."),
            400: OpenApiResponse(description="Invalid email or already subscribed (active)."),
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
                return Response(
                    success_response(message="Subscribed successfully."),
                    status=status.HTTP_201_CREATED
                )
            else:
                if not obj.is_active:
                    obj.is_active = True
                    obj.save()
                    return Response(
                    success_response(message="Subscription reactivated."),
                    status=status.HTTP_200_OK
                )
                return Response(
                    error_response("Email already subscribed.", code=4002),
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(
            error_response("Validation failed", code=2001, errors=serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )


class LSTMPredictionView(APIView):
    """
    LSTM‑based prediction endpoint.
    Accepts symbol and optional news text, returns directional prediction with confidence.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="LSTM prediction",
        description="Returns a directional prediction (UP/DOWN) using the LSTM model. Optionally incorporates news text.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Stock ticker',
                required=True
            ),
            OpenApiParameter(
                name='news',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='News headline or text for context',
                required=False,
                default=''
            ),
        ],
        responses={
            200: LSTMPredictionResponseSerializer,
            400: OpenApiResponse(description="Missing symbol or prediction failed"),
            500: OpenApiResponse(description="Internal server error"),
        },
        tags=["LSTM"]
    )
    def get(self, request):
        symbol = request.query_params.get('symbol')
        if not symbol:
            return Response(
                error_response("Symbol is required.", code=2001),
                status=status.HTTP_400_BAD_REQUEST
            )

        news_text = request.query_params.get('news', '')

        cache_key = f"lstm_{symbol}_{hash(news_text)}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        try:
            predictor = get_lstm_predictor()
            result = predictor.predict(symbol, news_text)

            if not result.get('success'):
                return Response(
                    error_response(result.get('error', 'Prediction failed'), code=5001),
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

            result['symbol'] = symbol.upper()
            result['timestamp'] = datetime.utcnow().isoformat() + 'Z'

            cache.set(cache_key, result, timeout=300)
            return Response(
                success_response(data=result),
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception(f"Error in LSTMPredictionView for {symbol}: {e}")
            return Response(
                error_response(f"Internal server error: {str(e)}", code=9001),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        

class SentimentAnalysisView(APIView):
    """
    Dedicated sentiment analysis endpoint.
    Returns sentiment metrics for a given symbol based on recent news.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get sentiment analysis",
        description="Returns sentiment score, distribution, history, and news source statistics for a given symbol.",
        parameters=[
            OpenApiParameter(
                name='symbol',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Stock ticker (e.g., AAPL)',
                required=True
            ),
            OpenApiParameter(
                name='time_range',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Time range: 7d, 30d',
                required=False,
                default='7d'
            ),
        ],
        responses={
            200: OpenApiResponse(
                description='Sentiment analysis results',
                examples=[
                    {
                        "application/json": {
                            "success": True,
                            "data": {
                                "sentiment": {
                                    "score": 0.65,
                                    "label": "Bullish"
                                },
                                "news_count": 142,
                                "source_stats": {
                                    "tier1_count": 12,
                                    "reliability_sum": 9.6,
                                    "tier1_sources": ["Reuters", "Bloomberg"]
                                },
                                "history": [
                                    {"date": "2026-07-05T00:00:00Z", "score": 0.55},
                                    {"date": "2026-07-06T00:00:00Z", "score": 0.60}
                                ]
                            },
                            "code": 200,
                            "timestamp": "2026-07-14T10:00:00Z"
                        }
                    }
                ]
            ),
            400: OpenApiResponse(description="Missing symbol"),
            500: OpenApiResponse(description="Internal server error"),
        },
        tags=["Sentiment Analysis"]
    )
    def get(self, request):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response(
                error_response("Symbol is required.", code=2001),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_range = request.query_params.get("time_range", "7d")
        
        # Parse time range
        days = 7 if time_range == '7d' else 30
        
        cache_key = f"sentiment_{symbol}_{time_range}"
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(
                success_response(data=cached_response),
                status=status.HTTP_200_OK
            )
        
        try:
            # Fetch recent news for sentiment analysis
            cutoff = datetime.now() - timedelta(days=days)
            news_items = ProcessedNews.objects.filter(
                symbol=symbol.upper(),
                published_at__gte=cutoff
            ).order_by('-published_at')[:100]
            
            if not news_items.exists():
                # Return neutral sentiment with no news
                response_data = {
                    "sentiment": {
                        "score": 0.0,
                        "label": "Neutral"
                    },
                    "news_count": 0,
                    "source_stats": {
                        "tier1_count": 0,
                        "reliability_sum": 0,
                        "tier1_sources": []
                    },
                    "history": []
                }
                cache.set(cache_key, response_data, timeout=300)
                return Response(
                    success_response(data=response_data),
                    status=status.HTTP_200_OK
                )
            
            # Calculate sentiment scores
            scores = [n.sentiment_score for n in news_items if n.sentiment_score is not None]
            valid_scores = [s for s in scores if s is not None]
            
            if valid_scores:
                avg_score = sum(valid_scores) / len(valid_scores)
                if avg_score > 0.2:
                    label = "Bullish"
                elif avg_score < -0.2:
                    label = "Bearish"
                else:
                    label = "Neutral"
            else:
                avg_score = 0.0
                label = "Neutral"
            
            # Build source statistics
            reliable_sources = ['Reuters', 'Bloomberg', 'CNBC', 'Wall Street Journal', 'Financial Times']
            tier1_sources = []
            reliability_sum = 0
            tier1_count = 0
            
            for item in news_items[:50]:
                source = item.source_name or item.provider or ''
                if source in reliable_sources:
                    tier1_sources.append(source)
                    tier1_count += 1
                    reliability_sum += item.source_reliability or 70
            
            # Build history data (last 7 or 30 days)
            history = []
            for item in news_items[:min(days, len(news_items))]:
                if item.sentiment_score is not None:
                    history.append({
                        "date": item.published_at.isoformat(),
                        "score": round(item.sentiment_score, 4)
                    })
            
            # Sort history by date
            history.sort(key=lambda x: x['date'])
            
            response_data = {
                "sentiment": {
                    "score": round(avg_score, 4),
                    "label": label
                },
                "news_count": len(news_items),
                "source_stats": {
                    "tier1_count": tier1_count,
                    "reliability_sum": round(reliability_sum, 1) if reliability_sum > 0 else 0,
                    "tier1_sources": list(set(tier1_sources))[:5]
                },
                "history": history[-30:]  # Last 30 days
            }
            
            cache.set(cache_key, response_data, timeout=600)
            return Response(
                success_response(data=response_data),
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.exception(f"Error in SentimentAnalysisView for {symbol}: {e}")
            # Return fallback sentiment data
            fallback_data = {
                "sentiment": {
                    "score": 0.0,
                    "label": "Neutral"
                },
                "news_count": 0,
                "source_stats": {
                    "tier1_count": 0,
                    "reliability_sum": 0,
                    "tier1_sources": []
                },
                "history": []
            }
            return Response(
                success_response(data=fallback_data),
                status=status.HTTP_200_OK
            )


# ============================================================
#  – PREDICTION HISTORY SYSTEM
# ============================================================

class PredictionListView(APIView):
    """
    List predictions with filters.
    Returns paginated predictions with accuracy and SHAP data.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        import dateutil.parser

        symbol = request.query_params.get('symbol')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        outcome = request.query_params.get('outcome')  # 'correct', 'incorrect'
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        qs = Prediction.objects.all().order_by('-date')
        
        if symbol:
            qs = qs.filter(stock_symbol=symbol.upper())

        if date_from and date_from not in ['null', 'undefined', '']:
            try:
                parsed_date = dateutil.parser.parse(date_from)
                qs = qs.filter(date__gte=parsed_date.date())
            except (ValueError, TypeError, OverflowError) as e:
                logger.warning(f"Failed to parse date_from: {date_from} - {e}")
        
        if date_to and date_to not in ['null', 'undefined', '']:
            try:
                parsed_date = dateutil.parser.parse(date_to)
                qs = qs.filter(date__lte=parsed_date.date())
            except (ValueError, TypeError, OverflowError) as e:
                logger.warning(f"Failed to parse date_to: {date_to} - {e}")
        
        # Filter by outcome
        if outcome == 'correct':
            qs = qs.filter(is_correct=True)
        elif outcome == 'incorrect':
            qs = qs.filter(is_correct=False)    
        
        total = qs.count()
        qs = qs[offset:offset+limit]
        
        # Use PredictionDetailSerializer for full data
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
    Returns accuracy, precision, recall, F1, and per-symbol breakdown.
    """
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
        
        # Per-symbol breakdown
        symbols = qs.values_list('stock_symbol', flat=True).distinct()
        symbol_metrics = {}
        for sym in symbols:
            sym_qs = qs.filter(stock_symbol=sym)
            symbol_metrics[sym] = calculate_performance_metrics(sym_qs)
        
        # Total counts
        total_preds = qs.count()
        correct_preds = qs.filter(is_correct=True).count()
        
        # Recent accuracy (last 7 days)
        recent_start = datetime.now() - timedelta(days=7)
        recent_qs = qs.filter(resolution_date__gte=recent_start)
        recent_metrics = calculate_performance_metrics(recent_qs)
        
        return Response({
            'total_predictions': total_preds,
            'correct_predictions': correct_preds,
            'overall': metrics,
            'recent_accuracy': recent_metrics.get('accuracy', 0),
            'by_symbol': symbol_metrics
        })


class DriftDetectionView(APIView):
    """
    Detect model drift by comparing recent vs baseline performance.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        recent_days = int(request.query_params.get('recent_days', 30))
        baseline_days = int(request.query_params.get('baseline_days', 90))
        
        result = detect_drift(
            recent_period_days=recent_days,
            baseline_period_days=baseline_days
        )
        
        return Response(result)


class SHAPExplanationView(APIView):
    """
    Get SHAP explanation for a specific prediction.
    """
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
            return Response(
                {'error': 'Prediction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        

# stocks/views.py (add this near the bottom)
import os
from django.http import JsonResponse
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET", "POST"])
@api_view(['GET', 'POST'])
@authentication_classes([])   # No DRF authentication – we use our own secret token
@permission_classes([AllowAny])
def cron_resolve_predictions(request):
    """
    Endpoint for cron-job.org to trigger prediction resolution.
    Protected by a secret token passed as 'secret' query parameter.
    """
    # Get the secret from request (query string or POST body)
    secret = request.query_params.get('secret') or request.data.get('secret')
    expected_secret = os.environ.get('CRON_SECRET')
    
    # If CRON_SECRET is not set, reject all requests (fail-safe)
    if not expected_secret:
        logger.error("CRON_SECRET environment variable not set – cron endpoint disabled")
        return JsonResponse({'error': 'Cron endpoint not configured'}, status=500)
    
    # Validate the token
    if secret != expected_secret:
        logger.warning(f"Cron trigger rejected – invalid secret from {request.META.get('REMOTE_ADDR')}")
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    
    # Run the management command
    try:
        call_command('resolve_predictions', days=7)
        logger.info("Cron trigger: resolve_predictions completed successfully")
        return JsonResponse({'status': 'ok', 'message': 'Predictions resolved'})
    except Exception as e:
        logger.error(f"Cron trigger failed: {e}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)