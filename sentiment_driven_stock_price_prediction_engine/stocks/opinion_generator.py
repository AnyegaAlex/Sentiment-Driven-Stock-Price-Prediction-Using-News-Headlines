"""
Optimized Institutional Stock Analysis API v5.0
Production-ready with complete formatting functions and error handling
"""

import gc
import re
import logging
import datetime
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass, asdict
from pydantic import BaseModel, Field, validator
import numpy as np
import pandas as pd
import yfinance as yf

# Configure module logger
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration Constants
# ============================================================================

MARKET_REGIME_WINDOW = 63  # 3 months in trading days
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
    """Investment risk profile enumeration"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    
    @classmethod
    def _missing_(cls, value):
        """Case-insensitive lookup"""
        value = value.lower() if isinstance(value, str) else value
        for member in cls:
            if member.value == value:
                return member
        return cls.MEDIUM  # Default to medium

class MarketRegime(str, Enum):
    """Market regime enumeration"""
    BULL = "bull"
    BEAR = "bear"
    NEUTRAL = "neutral"

class Recommendation(str, Enum):
    """Investment recommendation enumeration"""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"

@dataclass
class MarketRegimeResult:
    """Market regime analysis result"""
    regime: MarketRegime
    confidence: float  # 0-100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "regime": self.regime.value,
            "confidence": self.confidence
        }

class TechnicalMetrics(BaseModel):
    """Technical analysis metrics with validation"""
    sma_50: float
    sma_200: float
    rsi: float = Field(..., ge=0, le=100)
    current_price: float = Field(..., gt=0)
    volatility: float = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=100)
    market_regime: MarketRegimeResult
    
    class Config:
        arbitrary_types_allowed = True
    
    @validator('rsi')
    def validate_rsi(cls, v):
        if v < 0 or v > 100:
            raise ValueError('RSI must be between 0 and 100')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "sma_50": self.sma_50,
            "sma_200": self.sma_200,
            "rsi": self.rsi,
            "current_price": self.current_price,
            "volatility": self.volatility,
            "confidence": self.confidence,
            "market_regime": self.market_regime.to_dict()
        }

class AnalysisResult(BaseModel):
    """Complete analysis result model"""
    symbol: str
    price: float
    recommendation: Recommendation
    technical_indicators: Dict[str, float]
    market_regime: Dict[str, Any]
    confidence: float
    risk_profile: RiskProfile
    timestamp: str
    summary: Optional[str] = None
    
    class Config:
        use_enum_values = True

# ============================================================================
# Market Regime Detector
# ============================================================================

class MarketRegimeDetector:
    """Optimized market regime detection with caching"""
    
    def __init__(self):
        self._cache = {}
        self._cache_timestamp = None
        self._cache_duration = datetime.timedelta(hours=1)  # Cache for 1 hour
    
    def get_current_regime(self, force_refresh: bool = False) -> MarketRegimeResult:
        """
        Detect current market regime based on SPY performance
        
        Args:
            force_refresh: Force refresh cache
            
        Returns:
            MarketRegimeResult with regime and confidence
        """
        # Check cache
        if not force_refresh and self._is_cache_valid():
            return self._cache
        
        try:
            # Download SPY data
            spy_data = yf.download("SPY", period="1y", progress=False)
            
            if spy_data.empty:
                logger.warning("Empty SPY data received, using neutral regime")
                return self._get_neutral_regime()
            
            # Calculate metrics
            closes = spy_data['Close']
            sma_50 = closes.rolling(50).mean().iloc[-1]
            sma_200 = closes.rolling(200).mean().iloc[-1]
            current_price = closes.iloc[-1]
            
            # Calculate volatility (annualized)
            returns = closes.pct_change().dropna()
            volatility = returns.std() * np.sqrt(252)
            
            # Determine regime based on multiple factors
            bull_signals = [
                current_price > sma_50,           # Above 50-day MA
                current_price > sma_200,           # Above 200-day MA
                sma_50 > sma_200,                   # Golden cross
                volatility < 0.25,                   # Low volatility
                returns.tail(20).mean() > 0         # Recent positive returns
            ]
            
            bull_factor = sum(bull_signals) / len(bull_signals)
            
            # Calculate confidence
            confidence = min(100, max(0, int(100 * bull_factor)))
            
            # Determine regime
            if bull_factor > 0.6:
                regime = MarketRegime.BULL
            elif bull_factor < 0.3:
                regime = MarketRegime.BEAR
            else:
                regime = MarketRegime.NEUTRAL
            
            result = MarketRegimeResult(regime=regime, confidence=confidence)
            
            # Update cache
            self._cache = result
            self._cache_timestamp = datetime.datetime.now()
            
            return result
            
        except Exception as e:
            logger.error(f"Market regime detection error: {str(e)}")
            return self._get_neutral_regime()
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if self._cache is None or self._cache_timestamp is None:
            return False
        return datetime.datetime.now() - self._cache_timestamp < self._cache_duration
    
    def _get_neutral_regime(self) -> MarketRegimeResult:
        """Return neutral regime as fallback"""
        return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)

# ============================================================================
# Technical Analyzer
# ============================================================================
class TechnicalAnalyzer:
    """Memory-efficient technical analysis with caching"""
    
    def __init__(self, max_cache_size: int = 50):
        self.regime_detector = MarketRegimeDetector()
        self._data_cache = {}
        self._max_cache_size = max_cache_size
        self._cache_access_count = {}
        self._min_data_points = 200  # Minimum required for SMA200
    
    def analyze(self, symbol: str) -> TechnicalMetrics:
        """
        Perform technical analysis for a symbol
        
        Args:
            symbol: Stock symbol
            
        Returns:
            TechnicalMetrics object with analysis results
        """
        try:
            # Get cached or download data
            data = self._get_cached_data(symbol)
            
            if data.empty or len(data) < self._min_data_points:
                logger.warning(f"Insufficient data for {symbol}, using fallback")
                return self._get_fallback_metrics()
            
            # Calculate technical indicators
            closes = data['Close']
            
            # Use last 200 days for SMA200 (or all available if less)
            sma_200 = closes.rolling(min(200, len(closes))).mean().iloc[-1]
            sma_50 = closes.rolling(50).mean().iloc[-1]
            current_price = closes.iloc[-1]
            
            # Calculate volatility (annualized) using last 60 days for recent volatility
            returns = closes.pct_change().dropna()
            recent_returns = returns.tail(60)
            volatility = recent_returns.std() * np.sqrt(252)
            
            # Calculate RSI
            rsi = self._calculate_rsi(closes)
            
            # Get market regime
            regime = self.regime_detector.get_current_regime()
            
            # Calculate confidence score
            confidence = self._calculate_confidence(
                data, sma_50, sma_200, current_price, rsi, volatility
            )
            
            return TechnicalMetrics(
                sma_50=float(sma_50),
                sma_200=float(sma_200),
                rsi=float(rsi),
                current_price=float(current_price),
                volatility=float(volatility),
                confidence=float(confidence),
                market_regime=regime
            )
            
        except Exception as e:
            logger.error(f"Technical analysis failed for {symbol}: {str(e)}")
            return self._get_fallback_metrics()
    
    def _get_cached_data(self, symbol: str) -> pd.DataFrame:
        """
        Get cached data or download new data with progressive fallback strategy.
        
        Strategy:
        1. Try 2 years first (enough for SMA200 with buffer)
        2. If insufficient data, try 5 years
        3. Finally try max available data
        4. Implement LRU-like cache eviction
        """
        # Update access count for LRU tracking
        self._cache_access_count[symbol] = self._cache_access_count.get(symbol, 0) + 1
        
        # Return cached data if available
        if symbol in self._data_cache:
            logger.debug(f"Cache hit for {symbol}")
            return self._data_cache[symbol]
        
        # Evict least accessed if cache is full
        if len(self._data_cache) >= self._max_cache_size:
            self._evict_least_used()
        
        # Download new data with progressive periods
        periods_to_try = [
            ("2y", "2 years (primary)"),
            ("5y", "5 years (fallback)"), 
            ("max", "maximum available (final fallback)")
        ]
        
        data = pd.DataFrame()
        for period, description in periods_to_try:
            try:
                logger.info(f"Downloading {period} data for {symbol} ({description})")
                
                # Add small delay to avoid rate limiting
                import time
                time.sleep(0.5)
                
                data = yf.download(
                    symbol, 
                    period=period, 
                    progress=False,
                    auto_adjust=True,  # Automatically adjust for splits/dividends
                    threads=False  # Disable threading for stability
                )
                
                # Check if we have enough data
                if len(data) >= self._min_data_points:
                    logger.info(f"Successfully downloaded {len(data)} days of data for {symbol} from {period}")
                    break
                else:
                    logger.warning(f"Insufficient data from {period}: {len(data)} days (need {self._min_data_points}+), trying next period")
                    continue
                    
            except Exception as e:
                logger.warning(f"Failed to download {period} data for {symbol}: {str(e)}")
                continue
        
        if data.empty:
            logger.error(f"Could not download any data for {symbol} after trying all periods")
            return pd.DataFrame()
        
        # Validate data quality
        if len(data) < 50:
            logger.error(f"Insufficient data for {symbol}: only {len(data)} days available")
            return pd.DataFrame()
        
        # Store in cache
        self._data_cache[symbol] = data
        logger.info(f"Cached {len(data)} days of data for {symbol}")
        
        return data
    
    def _evict_least_used(self):
        """Evict least frequently accessed cache entry"""
        if not self._data_cache:
            return
        
        # Find symbol with minimum access count
        min_symbol = min(
            self._cache_access_count,
            key=lambda s: self._cache_access_count.get(s, 0)
        )
        
        # Remove from cache
        if min_symbol in self._data_cache:
            logger.debug(f"Evicting {min_symbol} from cache (least used)")
            del self._data_cache[min_symbol]
        if min_symbol in self._cache_access_count:
            del self._cache_access_count[min_symbol]
    
    def _calculate_rsi(self, closes: pd.Series, window: int = 14) -> float:
        """Calculate Relative Strength Index"""
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
            
        except Exception as e:
            logger.error(f"RSI calculation error: {str(e)}")
            return 50.0  # Neutral RSI
    
    def _calculate_confidence(
        self, 
        data: pd.DataFrame, 
        sma_50: float, 
        sma_200: float, 
        current_price: float,
        rsi: float,
        volatility: float
    ) -> float:
        """Calculate confidence score for analysis"""
        try:
            closes = data['Close']
            
            # Signal factors
            above_50ma = current_price > sma_50
            above_200ma = current_price > sma_200
            
            # RSI conditions
            rsi_not_overbought = rsi < 70
            rsi_not_oversold = rsi > 30
            
            # Volatility condition
            low_volatility = volatility < 0.4
            
            # Trend strength (distance from moving averages)
            ma_distance = abs(current_price - sma_50) / sma_50
            trend_strength = min(1, ma_distance * 10)  # 10% distance = 1.0
            
            # Volume confirmation (if volume data available)
            volume_confirmation = 1.0
            if 'Volume' in data.columns:
                avg_volume = data['Volume'].tail(20).mean()
                current_volume = data['Volume'].iloc[-1]
                volume_confirmation = min(1.0, current_volume / avg_volume) if avg_volume > 0 else 1.0
            
            # Weighted score
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
            
        except Exception as e:
            logger.error(f"Confidence calculation error: {str(e)}")
            return 50.0
    
    def _get_fallback_metrics(self) -> TechnicalMetrics:
        """Return fallback metrics when analysis fails"""
        return TechnicalMetrics(
            sma_50=0.0,
            sma_200=0.0,
            rsi=50.0,
            current_price=0.0,
            volatility=0.0,
            confidence=0.0,
            market_regime=MarketRegimeResult(
                regime=MarketRegime.NEUTRAL, 
                confidence=50.0
            )
        )
    
    def clear_cache(self):
        """Clear all cached data"""
        self._data_cache.clear()
        self._cache_access_count.clear()
        gc.collect()
        logger.info("Technical analyzer cache cleared")
# ============================================================================
# Institutional Analysis Engine
# ============================================================================

class InstitutionalAnalysisEngine:
    """Optimized analysis engine with memory management"""
    
    def __init__(self, symbol: str, risk_type: Union[str, RiskProfile] = "medium"):
        """
        Initialize analysis engine
        
        Args:
            symbol: Stock symbol
            risk_type: Risk profile (low/medium/high)
        """
        self.symbol = symbol.upper()
        self.risk_type = RiskProfile(risk_type) if isinstance(risk_type, str) else risk_type
        self.technical_analyzer = TechnicalAnalyzer()
        
        self._validate_symbol()
    
    def _validate_symbol(self):
        """Validate stock symbol format"""
        if not re.match(r'^[A-Z]{1,5}$', self.symbol):
            raise ValueError(f"Invalid stock symbol format: {self.symbol}")
    
    def full_analysis(self) -> Dict[str, Any]:
        """
        Perform complete stock analysis
        
        Returns:
            Dictionary with analysis results
        """
        try:
            # Get technical analysis
            technicals = self.technical_analyzer.analyze(self.symbol)
            
            # Check if analysis succeeded
            if technicals.current_price == 0:
                logger.warning(f"Technical analysis returned zero price for {self.symbol}")
                return self._error_response("Unable to fetch price data")
            
            # Format and return response
            return self._format_response(technicals)
            
        except Exception as e:
            logger.error(f"Analysis failed for {self.symbol}: {str(e)}")
            return self._error_response(str(e))
            
        finally:
            # Ensure cleanup
            gc.collect()
    
    def _format_response(self, technicals: TechnicalMetrics) -> Dict[str, Any]:
        """Format analysis results for API response"""
        price = technicals.current_price
        
        # Generate recommendation based on technicals and risk profile
        recommendation = self._generate_recommendation(technicals)
        
        # Create analysis result
        result = {
            "symbol": self.symbol,
            "price": round(price, 2),
            "recommendation": recommendation.value,
            "technical_indicators": {
                "sma_50": round(technicals.sma_50, 2),
                "sma_200": round(technicals.sma_200, 2),
                "rsi": round(technicals.rsi, 1),
                "volatility": round(technicals.volatility * 100, 1)  # As percentage
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
        
        return result
    
    def _generate_recommendation(self, technicals: TechnicalMetrics) -> Recommendation:
        """Generate investment recommendation"""
        price = technicals.current_price
        rsi = technicals.rsi
        
        # Base signals
        above_200ma = price > technicals.sma_200
        above_50ma = price > technicals.sma_50
        
        # Adjust thresholds based on risk profile
        buy_rsi_threshold = 70 if self.risk_type == RiskProfile.HIGH else 65
        sell_rsi_threshold = 30 if self.risk_type == RiskProfile.HIGH else 35
        
        # Strong buy signals
        if above_200ma and above_50ma and rsi < buy_rsi_threshold:
            if rsi < 40 or self.risk_type == RiskProfile.HIGH:
                return Recommendation.STRONG_BUY
            return Recommendation.BUY
        
        # Strong sell signals
        if not above_200ma and not above_50ma and rsi > sell_rsi_threshold:
            if rsi > 60 or self.risk_type == RiskProfile.HIGH:
                return Recommendation.STRONG_SELL
            return Recommendation.SELL
        
        # Mixed signals
        if above_200ma and not above_50ma:
            return Recommendation.HOLD if rsi > 50 else Recommendation.BUY
        
        if not above_200ma and above_50ma:
            return Recommendation.HOLD if rsi < 50 else Recommendation.SELL
        
        return Recommendation.HOLD
    
    def _generate_summary(self, technicals: TechnicalMetrics, recommendation: Recommendation) -> str:
        """Generate human-readable summary"""
        price = technicals.current_price
        rsi_status = "overbought" if technicals.rsi > 70 else "oversold" if technicals.rsi < 30 else "neutral"
        
        summaries = {
            Recommendation.STRONG_BUY: f"Strong buy opportunity for {self.symbol} at ${price:.2f}. " +
                                      f"Technical indicators show bullish momentum with RSI at {technicals.rsi:.1f} ({rsi_status}).",
            
            Recommendation.BUY: f"Buy signal for {self.symbol} at ${price:.2f}. " +
                               f"Price action positive with RSI at {technicals.rsi:.1f}.",
            
            Recommendation.HOLD: f"Hold {self.symbol} at ${price:.2f}. " +
                                f"Mixed signals with RSI at {technicals.rsi:.1f} ({rsi_status}). " +
                                f"Market regime: {technicals.market_regime.regime.value}.",
            
            Recommendation.SELL: f"Sell signal for {self.symbol} at ${price:.2f}. " +
                                f"Weak technicals with RSI at {technicals.rsi:.1f}.",
            
            Recommendation.STRONG_SELL: f"Strong sell signal for {self.symbol} at ${price:.2f}. " +
                                        f"Bearish indicators across the board with RSI at {technicals.rsi:.1f}."
        }
        
        return summaries.get(recommendation, f"Analysis complete for {self.symbol} at ${price:.2f}")
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Return standardized error response"""
        return {
            "error": message,
            "symbol": self.symbol,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "failed"
        }

# ============================================================================
# Public API Functions
# ============================================================================

def generate_stock_opinion(symbol: str, risk_type: str = "medium") -> Dict[str, Any]:
    """
    Public interface for stock opinion generation
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        risk_type: Risk profile ('low', 'medium', 'high')
        
    Returns:
        Dictionary with analysis results
    """
    try:
        # Validate inputs
        if not symbol or not isinstance(symbol, str):
            return {
                "error": "Invalid symbol provided",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "status": "failed"
            }
        
        # Initialize and run analysis
        engine = InstitutionalAnalysisEngine(symbol, risk_type)
        result = engine.full_analysis()
        
        # Log success
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
    Format investment analysis for API response
    
    Args:
        analysis_data: Raw analysis data from generate_stock_opinion
        
    Returns:
        Formatted analysis data with consistent structure
    """
    try:
        # Handle error responses
        if "error" in analysis_data:
            return {
                "success": False,
                "error": analysis_data["error"],
                "symbol": analysis_data.get("symbol", "UNKNOWN"),
                "timestamp": analysis_data.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
            }
        
        # Extract data
        symbol = analysis_data.get("symbol", "UNKNOWN")
        recommendation = analysis_data.get("recommendation", "HOLD")
        confidence = analysis_data.get("confidence", 0)
        price = analysis_data.get("price", 0)
        
        # Create formatted response
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
            "summary": analysis_data.get("summary", f"{symbol}: {recommendation} with {confidence}% confidence"),
            "timestamp": analysis_data.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z"),
            "metadata": {
                "version": "5.0",
                "provider": "Institutional Analysis Engine"
            }
        }
        
        # Add investment thesis
        formatted["analysis"]["investment_thesis"] = _generate_investment_thesis(
            symbol, recommendation, confidence, analysis_data
        )
        
        return formatted
        
    except Exception as e:
        logger.error(f"Error formatting analysis: {str(e)}")
        return {
            "success": False,
            "error": "Formatting failed",
            "original_data": str(analysis_data)[:200],  # Truncate for safety
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

def _generate_investment_thesis(
    symbol: str, 
    recommendation: str, 
    confidence: float,
    analysis_data: Dict[str, Any]
) -> str:
    """Generate detailed investment thesis"""
    
    # Extract key metrics
    indicators = analysis_data.get("technical_indicators", {})
    regime = analysis_data.get("market_regime", {})
    
    rsi = indicators.get("rsi", 50)
    volatility = indicators.get("volatility", 20)
    market_regime = regime.get("regime", "neutral")
    
    # Base thesis on recommendation
    if recommendation in ["STRONG_BUY", "BUY"]:
        thesis = (f"Investment thesis for {symbol}: Technical indicators suggest bullish momentum "
                 f"with RSI at {rsi:.1f} and volatility at {volatility:.1f}%. "
                 f"The {market_regime} market regime supports this view. "
                 f"Confidence level: {confidence:.1f}%.")
        
        if confidence > 80:
            thesis += " Strong conviction based on multiple confirming indicators."
    
    elif recommendation in ["STRONG_SELL", "SELL"]:
        thesis = (f"Investment thesis for {symbol}: Technical indicators suggest bearish momentum "
                 f"with RSI at {rsi:.1f} indicating potential downside. "
                 f"Consider reducing exposure given {market_regime} market conditions. "
                 f"Confidence level: {confidence:.1f}%.")
    
    else:  # HOLD
        thesis = (f"Investment thesis for {symbol}: Mixed signals suggest maintaining current position. "
                 f"RSI at {rsi:.1f} indicates neutral momentum. "
                 f"Wait for clearer direction in {market_regime} market. "
                 f"Confidence level: {confidence:.1f}%.")
    
    return thesis

# ============================================================================
# Utility Functions
# ============================================================================

def validate_symbol(symbol: str) -> bool:
    """Validate stock symbol format"""
    return bool(re.match(r'^[A-Z]{1,5}$', symbol.upper()))

def clear_all_caches():
    """Clear all cached data (useful for testing)"""
    analyzer = TechnicalAnalyzer()
    analyzer.clear_cache()
    logger.info("All caches cleared")

# ============================================================================
# Module initialization
# ============================================================================

# Ensure pandas doesn't show warnings
pd.options.mode.chained_assignment = None

logger.info("Institutional Analysis Engine v5.0 initialized")