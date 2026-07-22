"""
Institutional Stock Analysis Engine v5.3
Production-ready with multi-source data fetching, LSTM integration, and robust fallbacks.

Key Features:
- Multi-source data fetching (Finnhub primary, Twelve Data secondary, Yahoo Finance, Alpha Vantage)
- Redis caching with TTL
- Rate limit handling with exponential backoff
- Static fallback prices for major symbols
- Market regime detection with caching
- LSTM integration for enhanced predictions
- Memory-efficient caching with LRU eviction
- Comprehensive error handling and logging

Author: Anyega Alex Kamau
Version: 5.3
"""

import gc
import re
import logging
import datetime
import time
import os
from django.conf import settings
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass

import numpy as np
import pandas as pd
import yfinance as yf
import requests
from pydantic import BaseModel, Field, field_validator

# Suppress warnings for production
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Configure pandas for production
pd.options.mode.chained_assignment = None

# Import LSTM predictor
from .lstm_predictor import get_lstm_predictor
from .cache_utils import (
    get_cached_price_data,
    cache_price_data,
    get_cached_technical_data,
    cache_technical_data,
    get_cached_data,
    set_cached_data,
    TTL_PRICE,
    TTL_TECHNICAL,
    TTL_MARKET_REGIME,
)

# Configure module logger
logger = logging.getLogger(__name__)


# ============================================================================
# Configuration Constants
# ============================================================================

class Config:
    """Production configuration constants."""
    
    # Data fetch settings
    MIN_DATA_POINTS = 200
    CACHE_MAX_SIZE = 50
    CACHE_DURATION_MINUTES = 30
    REQUEST_TIMEOUT = 15
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE = 200
    
    # Market regime
    MARKET_REGIME_WINDOW = 63  # 3 months in trading days
    
    # Static fallback prices for major symbols
    FALLBACK_PRICES = {
        "AAPL": 116.16, "MSFT": 420.50, "NVDA": 130.00,
        "GOOGL": 180.00, "AMZN": 190.00, "META": 510.00,
        "TSLA": 250.00, "JPM": 160.00, "IBM": 180.00,
        "VTI": 280.00
    }
    DEFAULT_FALLBACK_PRICE = 100.0
    
    # Sector ETFs
    SECTOR_ETFS = {
        "XLK": "Technology", "XLV": "Healthcare", "XLE": "Energy",
        "XLF": "Financial", "XLI": "Industrial", "XLB": "Materials",
        "XLRE": "Real Estate", "XLP": "Consumer Staples",
        "XLY": "Consumer Discretionary", "XLU": "Utilities",
        "XLC": "Communication"
    }


# ============================================================================
# Enums and Data Models
# ============================================================================

class RiskProfile(str, Enum):
    """Investment risk profile enumeration."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    
    @classmethod
    def _missing_(cls, value):
        value = value.lower() if isinstance(value, str) else value
        for member in cls:
            if member.value == value:
                return member
        return cls.MEDIUM


class MarketRegime(str, Enum):
    """Market regime classification."""
    BULL = "bull"
    BEAR = "bear"
    NEUTRAL = "neutral"


class Recommendation(str, Enum):
    """Trading recommendation enumeration."""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


@dataclass
class MarketRegimeResult:
    """Market regime analysis result."""
    regime: MarketRegime
    confidence: float  # 0-100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "regime": self.regime.value,
            "confidence": self.confidence
        }


class TechnicalMetrics(BaseModel):
    """Technical analysis metrics with validation."""
    sma_50: float
    sma_200: float
    rsi: float = Field(..., ge=0, le=100)
    current_price: float = Field(..., gt=0)
    volatility: float = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=100)
    volume: Optional[float] = None
    support: Optional[float] = None         
    resistance: Optional[float] = None      
    pivot: Optional[float] = None            
    price_history: Optional[List[float]] = None  
    market_regime: MarketRegimeResult
    
    class Config:
        arbitrary_types_allowed = True
    
    @field_validator('rsi')
    def validate_rsi(cls, v):
        if v < 0 or v > 100:
            raise ValueError('RSI must be between 0 and 100')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sma_50": self.sma_50,
            "sma_200": self.sma_200,
            "rsi": self.rsi,
            "current_price": self.current_price,
            "volatility": self.volatility,
            "confidence": self.confidence,
            "market_regime": self.market_regime.to_dict()
        }


# ============================================================================
# Market Regime Detector
# ============================================================================

class MarketRegimeDetector:
    """
    Market regime detector with Redis caching (30 minutes).
    
    Determines whether the market is in a bull, bear, or neutral regime
    based on SPY ETF price action and volatility.
    """
    
    def __init__(self):
        self._spy_cache = None
        self._spy_cache_timestamp = None
        self._cache_duration = datetime.timedelta(minutes=15)
        self._initialized = False  # ✅ Track initialization
    
    def get_current_regime(self, force_refresh: bool = False) -> MarketRegimeResult:
        """Get current market regime with Redis caching."""
        self._ensure_initialized()  # ✅ Lazy init
        if not force_refresh:
            cached = get_cached_data("market_regime")
            if cached is not None:
                logger.debug("Market regime cache hit")
                return cached
        
        spy_data = self._fetch_spy_data()
        if spy_data.empty:
            logger.warning("Empty SPY data, using neutral regime")
            return self._get_neutral_regime()
        
        try:
            closes = spy_data['Close']
            sma_50 = closes.rolling(50).mean().iloc[-1]
            sma_200 = closes.rolling(200).mean().iloc[-1]
            current_price = closes.iloc[-1]
            returns = closes.pct_change().dropna()
            volatility = returns.std() * np.sqrt(252)
            
            bull_signals = [
                current_price > sma_50,
                current_price > sma_200,
                sma_50 > sma_200,
                volatility < 0.25,
                returns.tail(20).mean() > 0
            ]
            bull_factor = sum(bull_signals) / len(bull_signals)
            confidence = min(100, max(0, int(100 * bull_factor)))
            
            if bull_factor > 0.6:
                regime = MarketRegime.BULL
            elif bull_factor < 0.3:
                regime = MarketRegime.BEAR
            else:
                regime = MarketRegime.NEUTRAL
            
            result = MarketRegimeResult(regime=regime, confidence=confidence)
            set_cached_data("market_regime", result, TTL_MARKET_REGIME)
            return result
            
        except Exception as e:
            logger.error(f"Market regime detection error: {str(e)}")
            return self._get_neutral_regime()
    
    def _fetch_spy_data(self) -> pd.DataFrame:
        """Fetch SPY data with caching."""
        now = datetime.datetime.now()
        if (self._spy_cache is not None and 
            self._spy_cache_timestamp is not None and
            now - self._spy_cache_timestamp < datetime.timedelta(minutes=15)):
            return self._spy_cache
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                spy_data = yf.download(
                    "SPY",
                    period="1y",
                    progress=False,
                    auto_adjust=True,
                    timeout=Config.REQUEST_TIMEOUT
                )
                if not spy_data.empty:
                    self._spy_cache = spy_data
                    self._spy_cache_timestamp = now
                    return spy_data
            except Exception as e:
                logger.warning(f"SPY download attempt {attempt + 1} failed: {e}")
                time.sleep(Config.RETRY_DELAY * (attempt + 1))
        
        logger.error("All SPY download attempts failed")
        return pd.DataFrame()
    
    def _get_neutral_regime(self) -> MarketRegimeResult:
        """Return a neutral regime as fallback."""
        return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)


# ============================================================================
# Technical Analyzer
# ============================================================================

class TechnicalAnalyzer:
    """
    Technical analysis engine with multi-source data fetching and Redis caching.
    
    Data sources (in order of preference):
    1. Finnhub (primary – 60 calls/min free tier)
    2. Twelve Data (secondary – 800 calls/day)
    3. Yahoo Finance (fallback – unlimited but unreliable)
    4. Alpha Vantage (last resort – 5 calls/min)
    5. Static fallback (ultimate fallback)
    """
    
    def __init__(self):
        self.regime_detector = None  # ✅ Lazy init
        self.regime_detector = MarketRegimeDetector()
        self._min_data_points = Config.MIN_DATA_POINTS
        
        # Get API keys from environment
        self.finnhub_key = os.getenv('FINNHUB_API_KEY', '')
        self.twelvedata_key = os.getenv('TWELVEDATA_API_KEY', '')
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_KEY', '')
        
        def _ensure_initialized(self):
            """Lazy initialize – only create heavy objects when needed."""
            if self._initialized:
                return
            
            # ✅ Create regime detector only when first needed
            self.regime_detector = MarketRegimeDetector()
            self._initialized = True
            logger.info("TechnicalAnalyzer initialized")
        
        def analyze(self, symbol: str) -> TechnicalMetrics:
            """Perform technical analysis on a given symbol."""
            self._ensure_initialized()  # ✅ Lazy init

        if not self.finnhub_key:
            logger.warning("FINNHUB_API_KEY not set – Finnhub data will be unavailable")
        if not self.twelvedata_key:
            logger.warning("TWELVEDATA_API_KEY not set – Twelve Data will be unavailable")
    
    def _fetch_from_finnhub(self, symbol: str) -> pd.DataFrame:
        """
        Fetch price data from Finnhub API.
        60 calls/min free tier – reliable and fast.
        """
        if not self.finnhub_key:
            return pd.DataFrame()
        
        try:
            # Get quote (to verify symbol exists)
            quote_url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={self.finnhub_key}"
            quote_resp = requests.get(quote_url, timeout=5)
            quote_data = quote_resp.json()
            
            if 'c' not in quote_data or quote_data['c'] <= 0:
                logger.debug(f"Finnhub: No valid quote for {symbol}")
                return pd.DataFrame()
            
            # Get historical candles (up to 300 days)
            now = datetime.datetime.now()
            start = (now - datetime.timedelta(days=300)).strftime('%Y-%m-%d')
            end = now.strftime('%Y-%m-%d')
            
            candle_url = (
                f"https://finnhub.io/api/v1/stock/candle"
                f"?symbol={symbol}"
                f"&resolution=D"
                f"&from={start}"
                f"&to={end}"
                f"&token={self.finnhub_key}"
            )
            candle_resp = requests.get(candle_url, timeout=10)
            candle_data = candle_resp.json()
            
            if 'c' not in candle_data or len(candle_data['c']) < 20:
                logger.debug(f"Finnhub: Insufficient candle data for {symbol}")
                return pd.DataFrame()
            
            # Build DataFrame
            df = pd.DataFrame({
                'Close': candle_data['c'],
                'High': candle_data['h'],
                'Low': candle_data['l'],
                'Open': candle_data['o'],
                'Volume': candle_data['v']
            }, index=pd.to_datetime(candle_data['t'], unit='s'))
            
            df = df.sort_index()
            logger.info(f"Fetched {len(df)} days for {symbol} from Finnhub")
            return df

        except Exception as e:
            logger.warning(f"Finnhub fetch failed for {symbol}: {e}")
            return pd.DataFrame()
    
    def _fetch_from_twelvedata(self, symbol: str) -> pd.DataFrame:
        """
        Fetch price data from Twelve Data API.
        800 calls/day free tier – reliable backup.
        """
        if not self.twelvedata_key:
            return pd.DataFrame()

        try:
            url = "https://api.twelvedata.com/time_series"
            params = {
                'symbol': symbol,
                'interval': '1day',
                'outputsize': 200,
                'apikey': self.twelvedata_key,
            }
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if 'values' not in data or not data['values']:
                logger.debug(f"Twelve Data: No data for {symbol}")
                return pd.DataFrame()

            # Build DataFrame
            df = pd.DataFrame(data['values'])
            df['datetime'] = pd.to_datetime(df['datetime'])
            df.set_index('datetime', inplace=True)


            df.rename(columns={
                'open': 'Open',
                'high': 'High',
                'low': 'Low',
                'close': 'Close',
                'volume': 'Volume'
            }, inplace=True)

            df = df.astype(float)
            df = df.sort_index()

            logger.info(f"Fetched {len(df)} days for {symbol} from Twelve Data")
            return df

        except Exception as e:
            logger.warning(f"Twelve Data fetch failed for {symbol}: {e}")
            return pd.DataFrame()
    
    def _fetch_from_yahoo(self, symbol: str) -> pd.DataFrame:
        """Fetch data from Yahoo Finance with rate limit handling."""
        periods = ['2y', '5y', 'max']
        data = pd.DataFrame()
        
        for period in periods:
            for attempt in range(Config.MAX_RETRIES):
                try:
                    logger.info(f"Fetching {period} data for {symbol} from Yahoo (attempt {attempt + 1})")
                    data = yf.download(
                        symbol,
                        period=period,
                        progress=False,
                        auto_adjust=True,
                        threads=False,
                        timeout=Config.REQUEST_TIMEOUT
                    )
                    
                    if not data.empty and len(data) >= self._min_data_points:
                        logger.info(f"Successfully fetched {len(data)} days for {symbol}")
                        return data
                    elif not data.empty:
                        logger.warning(f"Insufficient data from {period}: {len(data)} days")
                        
                except Exception as e:
                    error_msg = str(e)
                    if "Rate limit" in error_msg or "Too Many Requests" in error_msg:
                        logger.warning(f"Rate limited for {symbol}, waiting {Config.RETRY_DELAY * 2}s...")
                        time.sleep(Config.RETRY_DELAY * 2 * (attempt + 1))
                        continue
                    logger.warning(f"Yahoo Finance failed for {symbol}: {e}")
                    time.sleep(Config.RETRY_DELAY)
                    continue
                
                if not data.empty:
                    break
        
        return data
    
    def _fetch_from_alpha_vantage(self, symbol: str) -> pd.DataFrame:
        """Fetch data from Alpha Vantage as last resort."""
        if not self.alpha_vantage_key:
            return pd.DataFrame()
        
        try:
            response = requests.get(
                'https://www.alphavantage.co/query',
                params={
                    'function': 'TIME_SERIES_DAILY',
                    'symbol': symbol,
                    'apikey': self.alpha_vantage_key,
                    'outputsize': 'compact'
                },
                timeout=Config.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            if 'Time Series (Daily)' in data:
                ts = data['Time Series (Daily)']
                df = pd.DataFrame.from_dict(ts, orient='index')
                df.index = pd.to_datetime(df.index)
                df = df.sort_index()
                df['Close'] = df['4. close'].astype(float)
                df['Volume'] = df['5. volume'].astype(float)
                logger.info(f"Fetched {len(df)} days for {symbol} from Alpha Vantage")
                return df
                
        except Exception as e:
            logger.warning(f"Alpha Vantage failed for {symbol}: {e}")
        
        return pd.DataFrame()
    
    def _get_cached_data(self, symbol: str) -> pd.DataFrame:
        """
        Get data from Redis cache or fetch from sources.
        
        Data sources (in order):
        1. Redis cache
        2. Finnhub (primary)
        3. Twelve Data (secondary)
        4. Yahoo Finance (fallback)
        5. Alpha Vantage (last resort)
        """
        # 1. Try Redis cache first
        cached_data = get_cached_price_data(symbol)
        if cached_data is not None and not cached_data.empty:
            logger.debug(f"Cache hit for {symbol}")
            return cached_data
        
        # 2. Fetch from Finnhub (primary)
        logger.info(f"Fetching {symbol} from Finnhub (primary)")
        data = self._fetch_from_finnhub(symbol)
        if not data.empty:
            cache_price_data(symbol, data, TTL_PRICE)
            return data
        
        # 3. Fetch from Twelve Data (secondary)
        logger.info(f"Fetching {symbol} from Twelve Data (secondary)")
        data = self._fetch_from_twelvedata(symbol)
        if not data.empty:
            cache_price_data(symbol, data, TTL_PRICE)
            return data
        
        # 4. Fetch from Yahoo Finance (fallback)
        logger.info(f"Fetching {symbol} from Yahoo Finance (fallback)")
        data = self._fetch_from_yahoo(symbol)
        if not data.empty:
            cache_price_data(symbol, data, TTL_PRICE)
            return data
        
        # 5. Fetch from Alpha Vantage (last resort)
        logger.info(f"Fetching {symbol} from Alpha Vantage (last resort)")
        data = self._fetch_from_alpha_vantage(symbol)
        if not data.empty:
            cache_price_data(symbol, data, TTL_PRICE)
            return data
        
        logger.warning(f"All data sources failed for {symbol}")
        return pd.DataFrame()
    
    def analyze(self, symbol: str) -> TechnicalMetrics:
        """
        Perform technical analysis on a given symbol.
        
        Args:
            symbol: Stock ticker symbol
            
        Returns:
            TechnicalMetrics object with all indicators
        """
        try:
            # 1. Check Redis for cached technical metrics
            cached_metrics = get_cached_technical_data(symbol)
            if cached_metrics is not None:
                logger.debug(f"Technical metrics cache hit for {symbol}")
                return cached_metrics
            
            # 2. Fetch price data (from cache or API)
            data = self._get_cached_data(symbol)
            
            if data.empty or len(data) < self._min_data_points:
                logger.warning(f"Insufficient data for {symbol}, using fallback")
                metrics = self._get_fallback_metrics(symbol)
                cache_technical_data(symbol, metrics, TTL_TECHNICAL)
                return metrics
            
            # 3. Calculate metrics
            closes = data['Close']
            sma_200 = closes.rolling(min(200, len(closes))).mean().iloc[-1]
            sma_50 = closes.rolling(50).mean().iloc[-1]
            current_price = closes.iloc[-1]
            returns = closes.pct_change().dropna()
            recent_returns = returns.tail(60)
            volatility = recent_returns.std() * np.sqrt(252)
            rsi = self._calculate_rsi(closes)
            regime = self.regime_detector.get_current_regime()
            confidence = self._calculate_confidence(
                data, sma_50, sma_200, current_price, rsi, volatility
            )

            volume = float(data['Volume'].iloc[-1]) if 'Volume' in data.columns else None
            
            # Ensure price is valid
            if current_price <= 0:
                current_price = Config.FALLBACK_PRICES.get(symbol, Config.DEFAULT_FALLBACK_PRICE)
                logger.warning(f"Zero price detected for {symbol}, using fallback {current_price}")
            
            metrics = TechnicalMetrics(
                sma_50=float(sma_50),
                sma_200=float(sma_200),
                rsi=float(rsi),
                current_price=float(current_price),
                volatility=float(volatility),
                confidence=float(confidence),
                volume=volume, 
                market_regime=regime
            )
            
            # 4. Store in Redis cache
            cache_technical_data(symbol, metrics, TTL_TECHNICAL)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Technical analysis failed for {symbol}: {str(e)}")
            metrics = self._get_fallback_metrics(symbol)
            cache_technical_data(symbol, metrics, TTL_TECHNICAL)
            return metrics
    
    def _calculate_rsi(self, closes: pd.Series, window: int = 14) -> float:
        """Calculate RSI indicator."""
        try:
            delta = closes.diff()
            gain = delta.clip(lower=0)
            loss = -delta.clip(upper=0)
            avg_gain = gain.ewm(alpha=1/window, adjust=False).mean().iloc[-1]
            avg_loss = loss.ewm(alpha=1/window, adjust=False).mean().iloc[-1]
            if avg_loss == 0:
                return 100.0
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            return float(rsi)
        except Exception:
            return 50.0
    
    def _calculate_confidence(
        self,
        data: pd.DataFrame,
        sma_50: float,
        sma_200: float,
        current_price: float,
        rsi: float,
        volatility: float
    ) -> float:
        """Calculate confidence score for the analysis."""
        try:
            above_50ma = current_price > sma_50
            above_200ma = current_price > sma_200
            rsi_not_overbought = rsi < 70
            rsi_not_oversold = rsi > 30
            low_volatility = volatility < 0.4
            ma_distance = abs(current_price - sma_50) / sma_50
            trend_strength = min(1, ma_distance * 10)
            volume_confirmation = 1.0
            
            if 'Volume' in data.columns:
                avg_volume = data['Volume'].tail(20).mean()
                current_volume = data['Volume'].iloc[-1]
                volume_confirmation = min(1.0, current_volume / avg_volume) if avg_volume > 0 else 1.0
            
            raw_score = sum([
                20 * above_50ma,
                20 * above_200ma,
                10 * rsi_not_overbought,
                10 * rsi_not_oversold,
                15 * low_volatility,
                15 * trend_strength,
                10 * volume_confirmation
            ])
            return min(100, max(0, raw_score))
        except Exception:
            return 50.0
    
    def _get_fallback_metrics(self, symbol: str) -> TechnicalMetrics:
        """Generate fallback metrics when data fetching fails."""
        price = Config.FALLBACK_PRICES.get(symbol.upper(), Config.DEFAULT_FALLBACK_PRICE)
        return TechnicalMetrics(
            sma_50=price * 0.98,
            sma_200=price * 0.95,
            rsi=50.0,
            current_price=price,
            volatility=0.2,
            confidence=30.0,
            volume=None,
            market_regime=MarketRegimeResult(
                regime=MarketRegime.NEUTRAL,
                confidence=50.0
            )
        )
    
    def clear_cache(self):
        """Clear all cached data."""
        from .cache_utils import clear_cache_pattern
        clear_cache_pattern("technical:*")
        clear_cache_pattern("price:*")
        logger.info("Cleared all technical and price cache")


# ============================================================================
# Institutional Analysis Engine
# ============================================================================

class InstitutionalAnalysisEngine:
    """
    Main analysis engine that combines technical analysis with LSTM predictions.
    
    Features:
    - Technical analysis with multiple indicators
    - LSTM integration for enhanced predictions
    - Risk profile-based recommendations
    - Comprehensive response formatting
    """
    
    def __init__(self, symbol: str, risk_type: Union[str, RiskProfile] = "medium"):
        self.symbol = symbol.upper()
        self.risk_type = RiskProfile(risk_type) if isinstance(risk_type, str) else risk_type
        self.technical_analyzer = get_technical_analyzer()
        self._validate_symbol()
    
    def _validate_symbol(self):
        """Validate stock symbol format."""
        if not re.match(r'^[A-Z]{1,5}$', self.symbol):
            raise ValueError(f"Invalid stock symbol format: {self.symbol}")
    
    def full_analysis(self, news_text: str = "") -> Dict[str, Any]:
        """
        Perform complete analysis including technical and LSTM.
        
        Args:
            news_text: Optional news text for LSTM context
            
        Returns:
            Complete analysis result dictionary
        """
        try:
            technicals = self.technical_analyzer.analyze(self.symbol)
            if technicals.current_price <= 0:
                logger.warning(f"Fallback price still zero for {self.symbol}, forcing default")
                technicals = self.technical_analyzer._get_fallback_metrics(self.symbol)
            
            result = self._format_response(technicals)
            
            # Add LSTM prediction
            result['lstm_prediction'] = self._get_lstm_prediction(news_text)
            
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed for {self.symbol}: {str(e)}")
            return self._error_response(str(e))
        finally:
            gc.collect()
    
    def _get_lstm_prediction(self, news_text: str) -> Dict[str, Any]:
        """Get LSTM prediction with error handling."""
        try:
            lstm_predictor = get_lstm_predictor()
            lstm_result = lstm_predictor.predict(self.symbol, news_text)
            
            if lstm_result.get('success'):
                return {
                    'direction': lstm_result['prediction'],
                    'confidence': lstm_result['confidence']
                }
            else:
                return {
                    'direction': 'UNAVAILABLE',
                    'confidence': 0.0,
                    'error': lstm_result.get('error', 'Unknown error')
                }
        except Exception as e:
            logger.warning(f"LSTM prediction failed for {self.symbol}: {e}")
            return {
                'direction': 'UNAVAILABLE',
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _format_response(self, technicals: TechnicalMetrics) -> Dict[str, Any]:
        """Format the analysis response."""
        price = technicals.current_price
        recommendation = self._generate_recommendation(technicals)
        
        return {
            "symbol": self.symbol,
            "price": round(price, 2),
            "recommendation": recommendation.value,
            "technical_indicators": {
                "sma_50": round(technicals.sma_50, 2),
                "sma_200": round(technicals.sma_200, 2),
                "rsi": round(technicals.rsi, 1),
                "volatility": round(technicals.volatility * 100, 1),
                "volume": int(technicals.volume) if technicals.volume else 0,
            },
            "market_regime": {
                "regime": technicals.market_regime.regime.value,
                "confidence": technicals.market_regime.confidence
            },
            "confidence": round(technicals.confidence, 1),
            "risk_profile": self.risk_type.value,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "summary": self._generate_summary(technicals, recommendation)
        }
    
    def _generate_recommendation(self, technicals: TechnicalMetrics) -> Recommendation:
        """Generate trading recommendation based on technicals."""
        price = technicals.current_price
        rsi = technicals.rsi
        above_200ma = price > technicals.sma_200
        above_50ma = price > technicals.sma_50
        
        buy_rsi_threshold = 70 if self.risk_type == RiskProfile.HIGH else 65
        sell_rsi_threshold = 30 if self.risk_type == RiskProfile.HIGH else 35
        
        if above_200ma and above_50ma and rsi < buy_rsi_threshold:
            if rsi < 40 or self.risk_type == RiskProfile.HIGH:
                return Recommendation.STRONG_BUY
            return Recommendation.BUY
        
        if not above_200ma and not above_50ma and rsi > sell_rsi_threshold:
            if rsi > 60 or self.risk_type == RiskProfile.HIGH:
                return Recommendation.STRONG_SELL
            return Recommendation.SELL
        
        if above_200ma and not above_50ma:
            return Recommendation.HOLD if rsi > 50 else Recommendation.BUY
        if not above_200ma and above_50ma:
            return Recommendation.HOLD if rsi < 50 else Recommendation.SELL
        
        return Recommendation.HOLD
    
    def _generate_summary(self, technicals: TechnicalMetrics, recommendation: Recommendation) -> str:
        """Generate a human-readable summary."""
        price = technicals.current_price
        rsi_status = "overbought" if technicals.rsi > 70 else "oversold" if technicals.rsi < 30 else "neutral"
        
        summaries = {
            Recommendation.STRONG_BUY: f"Strong buy opportunity for {self.symbol} at ${price:.2f}. "
                                      f"Technical indicators show bullish momentum with RSI at {technicals.rsi:.1f} ({rsi_status}).",
            Recommendation.BUY: f"Buy signal for {self.symbol} at ${price:.2f}. "
                               f"Price action positive with RSI at {technicals.rsi:.1f}.",
            Recommendation.HOLD: f"Hold {self.symbol} at ${price:.2f}. "
                                f"Mixed signals with RSI at {technicals.rsi:.1f} ({rsi_status}). "
                                f"Market regime: {technicals.market_regime.regime.value}.",
            Recommendation.SELL: f"Sell signal for {self.symbol} at ${price:.2f}. "
                                f"Weak technicals with RSI at {technicals.rsi:.1f}.",
            Recommendation.STRONG_SELL: f"Strong sell signal for {self.symbol} at ${price:.2f}. "
                                        f"Bearish indicators across the board with RSI at {technicals.rsi:.1f}."
        }
        return summaries.get(recommendation, f"Analysis complete for {self.symbol} at ${price:.2f}")
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Generate error response."""
        return {
            "error": message,
            "symbol": self.symbol,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "failed"
        }


# ============================================================================
# Public API Functions
# ============================================================================

def generate_stock_opinion(symbol: str, risk_type: str = "medium", news_text: str = "") -> Dict[str, Any]:
    """
    Generate a stock opinion analysis.
    
    Args:
        symbol: Stock ticker symbol
        risk_type: Risk profile (low, medium, high)
        news_text: Optional news text for LSTM
        
    Returns:
        Complete analysis result
    """
    try:
        if not symbol or not isinstance(symbol, str):
            return {
                "error": "Invalid symbol provided",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "status": "failed"
            }
        
        engine = InstitutionalAnalysisEngine(symbol, risk_type)
        result = engine.full_analysis(news_text)
        logger.info(f"Successfully generated opinion for {symbol}")
        return result
        
    except ValueError as e:
        logger.error(f"Validation error for {symbol}: {str(e)}")
        return {
            "error": str(e),
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "failed"
        }
    except Exception as e:
        logger.error(f"Unexpected error generating opinion for {symbol}: {str(e)}")
        return {
            "error": "Internal analysis error",
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "failed"
        }


def format_investment_analysis(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format the analysis data for frontend consumption.
    
    Args:
        analysis_data: Raw analysis data from generate_stock_opinion
        
    Returns:
        Formatted analysis response
    """
    try:
        if "error" in analysis_data:
            return {
                "success": False,
                "error": analysis_data["error"],
                "symbol": analysis_data.get("symbol", "UNKNOWN"),
                "timestamp": analysis_data.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
            }
        
        symbol = analysis_data.get("symbol", "UNKNOWN")
        recommendation = analysis_data.get("recommendation", "HOLD")
        confidence = analysis_data.get("confidence", 0)
        price = analysis_data.get("price", 0)
        
        formatted = {
            "success": True,
            "symbol": symbol,
            "analysis": {
                "recommendation": recommendation,
                "confidence": confidence,
                "current_price": price,
                "risk_profile": analysis_data.get("risk_profile", "medium"),
                "technical_indicators": analysis_data.get("technical_indicators", {}),
                "market_regime": analysis_data.get("market_regime", {})
            },
            "summary": analysis_data.get(
                "summary",
                f"{symbol}: {recommendation} with {confidence}% confidence"
            ),
            "timestamp": analysis_data.get(
                "timestamp",
                datetime.datetime.utcnow().isoformat() + "Z"
            ),
            "metadata": {
                "version": "5.3",
                "provider": "Institutional Analysis Engine"
            }
        }
        
        # Include LSTM prediction if present
        if "lstm_prediction" in analysis_data:
            formatted["lstm_prediction"] = analysis_data["lstm_prediction"]
        
        formatted["analysis"]["investment_thesis"] = _generate_investment_thesis(
            symbol, recommendation, confidence, analysis_data
        )
        
        return formatted
        
    except Exception as e:
        logger.error(f"Error formatting analysis: {str(e)}")
        return {
            "success": False,
            "error": "Formatting failed",
            "original_data": str(analysis_data)[:200],
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }


def _generate_investment_thesis(
    symbol: str,
    recommendation: str,
    confidence: float,
    analysis_data: Dict[str, Any]
) -> str:
    """Generate investment thesis from analysis data."""
    indicators = analysis_data.get("technical_indicators", {})
    regime = analysis_data.get("market_regime", {})
    rsi = indicators.get("rsi", 50)
    volatility = indicators.get("volatility", 20)
    market_regime = regime.get("regime", "neutral")
    
    if recommendation in ["STRONG_BUY", "BUY"]:
        thesis = (
            f"Investment thesis for {symbol}: Technical indicators suggest bullish momentum "
            f"with RSI at {rsi:.1f} and volatility at {volatility:.1f}%. "
            f"The {market_regime} market regime supports this view. "
            f"Confidence level: {confidence:.1f}%."
        )
        if confidence > 80:
            thesis += " Strong conviction based on multiple confirming indicators."
            
    elif recommendation in ["STRONG_SELL", "SELL"]:
        thesis = (
            f"Investment thesis for {symbol}: Technical indicators suggest bearish momentum "
            f"with RSI at {rsi:.1f} indicating potential downside. "
            f"Consider reducing exposure given {market_regime} market conditions. "
            f"Confidence level: {confidence:.1f}%."
        )
    else:
        thesis = (
            f"Investment thesis for {symbol}: Mixed signals suggest maintaining current position. "
            f"RSI at {rsi:.1f} indicates neutral momentum. "
            f"Wait for clearer direction in {market_regime} market. "
            f"Confidence level: {confidence:.1f}%."
        )
    
    return thesis


# ============================================================================
# Utility Functions
# ============================================================================

def validate_symbol(symbol: str) -> bool:
    """Validate stock symbol format."""
    return bool(re.match(r'^[A-Z]{1,5}$', symbol.upper()))


def clear_all_caches():
    """Clear all cached data."""
    analyzer = get_technical_analyzer()
    analyzer.clear_cache()
    logger.info("All caches cleared")


# ============================================================================
# SINGLETON INSTANCE – Shared across all views
# ============================================================================

_shared_analyzer = None
_shared_analyzer_lock = None

def get_technical_analyzer() -> TechnicalAnalyzer:
    """
    Get or create a shared TechnicalAnalyzer instance.
    This ensures cache is shared across all requests.
    """
    global _shared_analyzer, _shared_analyzer_lock
    
    if _shared_analyzer is None:
        import threading
        _shared_analyzer_lock = threading.Lock()
        
        with _shared_analyzer_lock:
            if _shared_analyzer is None:
                logger.info("Creating shared TechnicalAnalyzer instance")
                _shared_analyzer = TechnicalAnalyzer()
    
    return _shared_analyzer


def clear_shared_cache():
    """Clear the shared cache (useful for testing or manual refresh)."""
    global _shared_analyzer
    if _shared_analyzer is not None:
        _shared_analyzer.clear_cache()
        logger.info("Shared cache cleared")


# ============================================================================
# Module Initialization
# ============================================================================

logger.debug("Institutional Analysis Engine v5.3 loaded (lazy initialization)")