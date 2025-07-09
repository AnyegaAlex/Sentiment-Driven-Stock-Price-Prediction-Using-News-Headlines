"""
Optimized Institutional Stock Analysis API v4.2
Memory-efficient with enhanced error handling and reduced redundancy
"""

import gc
import re
import logging
import datetime
import numpy as np
import pandas as pd
import yfinance as yf
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from pydantic import BaseModel, Field

# Configuration
logger = logging.getLogger(__name__)
MARKET_REGIME_WINDOW = 63  # 3 months in trading days
SECTOR_ETFS = {
    "XLK": "Technology", "XLV": "Healthcare", "XLE": "Energy",
    "XLF": "Financial", "XLI": "Industrial", "XLB": "Materials",
    "XLRE": "Real Estate", "XLP": "Consumer Staples",
    "XLY": "Consumer Discretionary", "XLU": "Utilities",
    "XLC": "Communication"
}

class RiskProfile(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class MarketRegime(str, Enum):
    BULL = "bull"
    BEAR = "bear"
    NEUTRAL = "neutral"

@dataclass
class MarketRegimeResult:
    regime: MarketRegime
    confidence: float = Field(..., ge=0, le=100)

class TechnicalMetrics(BaseModel):
    sma_50: float
    sma_200: float
    rsi: float = Field(..., ge=0, le=100)
    current_price: float
    volatility: float
    confidence: float = Field(..., ge=0, le=100)
    market_regime: MarketRegimeResult

class MarketRegimeDetector:
    """Optimized market regime detection"""
    def get_current_regime(self) -> MarketRegimeResult:
        try:
            spy_data = yf.download("SPY", period=f"{MARKET_REGIME_WINDOW}d", progress=False)
            if spy_data.empty:
                return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)
            
            closes = spy_data['Close']
            sma_50 = closes.rolling(50).mean().iloc[-1]
            sma_200 = closes.rolling(200).mean().iloc[-1]
            current_price = closes.iloc[-1]
            volatility = closes.pct_change().std() * np.sqrt(252)
            
            bull_factor = (
                0.4 * (current_price > sma_50) +
                0.4 * (current_price > sma_200) +
                0.2 * (volatility < 0.2))
            
            confidence = min(100, max(0, int(100 * bull_factor)))
            
            if bull_factor > 0.6:
                return MarketRegimeResult(regime=MarketRegime.BULL, confidence=confidence)
            return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=confidence)
            
        except Exception as e:
            logger.error(f"Market regime error: {str(e)}")
            return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)

class TechnicalAnalyzer:
    """Memory-efficient technical analysis"""
    def __init__(self):
        self.regime_detector = MarketRegimeDetector()
        self._data_cache = {}

    def analyze(self, symbol: str) -> TechnicalMetrics:
        try:
            data = self._get_cached_data(symbol)
            if data.empty:
                raise ValueError("No data available")
                
            closes = data['Close']
            sma_50 = closes.rolling(50).mean().iloc[-1]
            sma_200 = closes.rolling(200).mean().iloc[-1]
            current_price = closes.iloc[-1]
            volatility = closes.pct_change().std() * np.sqrt(252)
            rsi = self._calculate_rsi(closes)
            regime = self.regime_detector.get_current_regime()
            
            return TechnicalMetrics(
                sma_50=float(sma_50),
                sma_200=float(sma_200),
                rsi=float(rsi),
                current_price=float(current_price),
                volatility=float(volatility),
                confidence=self._calculate_confidence(data, sma_50, sma_200, current_price),
                market_regime=regime
            )
            
        except Exception as e:
            logger.error(f"Technical analysis failed: {str(e)}")
            return self._get_fallback_metrics()

    def _get_cached_data(self, symbol: str) -> pd.DataFrame:
        """Cache data to avoid redundant downloads"""
        if symbol not in self._data_cache:
            try:
                data = yf.download(symbol, period="1y", progress=False)
                if len(data) < 60:  # If insufficient data
                    data = yf.download(symbol, period="2y", progress=False)
                self._data_cache[symbol] = data
            except Exception as e:
                logger.error(f"Data download failed: {str(e)}")
                return pd.DataFrame()
        return self._data_cache[symbol]

    def _calculate_rsi(self, closes: pd.Series, window: int = 14) -> float:
        delta = closes.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1/window).mean().iloc[-1]
        avg_loss = loss.ewm(alpha=1/window).mean().iloc[-1]
        rs = avg_gain / (avg_loss + 1e-9)
        return 100 - (100 / (1 + rs))

    def _calculate_confidence(self, data: pd.DataFrame, sma_50: float, sma_200: float, current_price: float) -> float:
        closes = data['Close']
        above_50ma = current_price > sma_50
        above_200ma = current_price > sma_200
        rsi = self._calculate_rsi(closes)
        rsi_ok = 30 < rsi < 70
        
        raw_score = sum([
            40 * above_50ma,
            40 * above_200ma,
            20 * rsi_ok
        ])
        
        return min(100, max(0, raw_score))

    def _get_fallback_metrics(self) -> TechnicalMetrics:
        return TechnicalMetrics(
            sma_50=0,
            sma_200=0,
            rsi=50,
            current_price=0,
            volatility=0,
            confidence=0,
            market_regime=MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)
        )

class InstitutionalAnalysisEngine:
    """Optimized analysis engine with memory management"""
    def __init__(self, symbol: str, risk_type: str = "medium"):
        self.symbol = symbol.upper()
        self.risk_type = RiskProfile(risk_type.lower())
        self.technical_analyzer = TechnicalAnalyzer()
        self._validate_symbol()

    def _validate_symbol(self):
        if not re.match(r'^[A-Z]{1,5}$', self.symbol):
            raise ValueError("Invalid stock symbol")

    def full_analysis(self) -> Dict[str, Any]:
        try:
            technicals = self.technical_analyzer.analyze(self.symbol)
            if technicals.current_price == 0:
                return self._error_response("Technical analysis failed")
                
            return self._format_response(technicals)
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return self._error_response(str(e))
            
        finally:
            gc.collect()  # Ensure cleanup

    def _format_response(self, technicals: TechnicalMetrics) -> Dict:
        price = technicals.current_price
        recommendation = self._generate_recommendation(technicals)
        
        return {
            "symbol": self.symbol,
            "price": price,
            "recommendation": recommendation,
            "technical_indicators": {
                "sma_50": technicals.sma_50,
                "sma_200": technicals.sma_200,
                "rsi": technicals.rsi,
                "volatility": technicals.volatility
            },
            "market_regime": {
                "regime": technicals.market_regime.regime.value,
                "confidence": technicals.market_regime.confidence
            },
            "confidence": technicals.confidence,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

    def _generate_recommendation(self, technicals: TechnicalMetrics) -> str:
        price = technicals.current_price
        if price > technicals.sma_200 and technicals.rsi < 70:
            return "BUY"
        elif price < technicals.sma_200 and technicals.rsi > 30:
            return "SELL"
        return "HOLD"

    def _error_response(self, message: str) -> Dict:
        return {
            "error": message,
            "symbol": self.symbol,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

def generate_stock_opinion(symbol: str, risk_type: str = "medium") -> Dict[str, Any]:
    """Public interface for stock opinion generation"""
    try:
        engine = InstitutionalAnalysisEngine(symbol, risk_type)
        return engine.full_analysis()
    except Exception as e:
        logger.error(f"Opinion generation failed: {str(e)}")
        return {
            "error": str(e),
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }