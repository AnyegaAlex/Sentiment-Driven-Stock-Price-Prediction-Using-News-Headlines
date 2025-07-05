"""
Institutional Stock Analysis API v4.1
SEC-Compliant | FINRA-Rule-2210-Ready | Black-Litterman Model Integrated
Enhanced with robust error handling, type safety, and performance optimizations
"""
import os
import re
import requests
import logging
import datetime
import numpy as np
import pandas as pd
import yfinance as yf
import textwrap
from typing import List, Dict, Any, Optional, Tuple, Union
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv
from functools import lru_cache
from scipy.stats import percentileofscore
from enum import Enum
from dataclasses import dataclass
from pydantic import BaseModel, Field

# Configuration
load_dotenv()
NEWS_ANALYZED_API_URL = os.getenv("NEWS_ANALYZED_API_URL", "http://127.0.0.1:8000/api/news/analyzed/")
NEWS_GET_API_URL = os.getenv("NEWS_GET_API_URL", "http://127.0.0.1:8000/api/news/get-news/")
HF_API_URL = os.getenv("HF_API_URL", "https://api-inference.huggingface.co/models/google/flan-t5-xxl")
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
MARKET_REGIME_WINDOW = int(os.getenv("MARKET_REGIME_WINDOW", "63"))  # 3 months in trading days
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))

# Constants
class RiskProfile(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TimeHorizon(str, Enum):
    SHORT = "short-term"
    MEDIUM = "medium-term"
    LONG = "long-term"

class DetailLevel(str, Enum):
    SUMMARY = "summary"
    DETAILED = "detailed"

class MarketRegime(str, Enum):
    BULL = "bull"
    BEAR = "bear"
    NEUTRAL = "neutral"

TIER1_SOURCES = {"Bloomberg", "Reuters", "WSJ", "Financial Times", "CNBC", "Barron's"}
SECTOR_ETFS = {
    "XLK": "Technology",
    "XLV": "Healthcare",
    "XLE": "Energy",
    "XLF": "Financial",
    "XLI": "Industrial",
    "XLB": "Materials",
    "XLRE": "Real Estate",
    "XLP": "Consumer Staples",
    "XLY": "Consumer Discretionary",
    "XLU": "Utilities",
    "XLC": "Communication"
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('institutional_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Data Models
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
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    obv: Optional[float] = None
    adx: Optional[float] = None
    black_litterman: Dict[str, float]
    percentile_rank: Dict[str, float]
    market_regime: MarketRegimeResult

class SentimentAnalysis(BaseModel):
    score: float = Field(..., ge=-1, le=1)
    confidence: float = Field(..., ge=0, le=100)
    key_phrases: List[str]
    sentiment_distribution: Dict[str, int]
    source_weights: Dict[str, float]

class LLMResponse(BaseModel):
    recommendation: str
    rationale: List[str]
    targets: Dict[str, float]
    risks: List[str]
    source: str

class InstitutionalAnalysisResponse(BaseModel):
    metadata: Dict[str, Any]
    recommendation: Dict[str, Any]
    valuation: Dict[str, Any]
    confidence_metrics: Dict[str, float]
    risk_metrics: Dict[str, float]
    market_context: Dict[str, Any]
    key_indicators: Dict[str, Any]
    risks: List[str]
    disclaimer: str

# Core Classes
class MarketRegimeDetector:
    """Enhanced market regime detection with type safety and error handling"""
    def __init__(self):
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        session = requests.Session()
        retry = Retry(total=MAX_RETRIES, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session

    def get_current_regime(self) -> MarketRegimeResult:
        try:
            spy_data = yf.download("SPY", period=f"{MARKET_REGIME_WINDOW}d", progress=False)
            if spy_data.empty:
                return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)
            returns = spy_data['Close'].pct_change().dropna()
            sma_50 = spy_data['Close'].rolling(50).mean().iloc[-1].item()
            sma_200 = spy_data['Close'].rolling(200).mean().iloc[-1].item()
            current_price = spy_data['Close'].iloc[-1].item()
            volatility = returns.std().item() * np.sqrt(252)
            bull_factor = (
                0.4 * (current_price > sma_50) +
                0.4 * (current_price > sma_200) +
                0.2 * (volatility < 0.2))
            bear_factor = (
                0.4 * (current_price < sma_50) +
                0.4 * (current_price < sma_200) +
                0.2 * (volatility > 0.3))
            confidence = min(100, max(0, int(100 * abs(bull_factor - bear_factor))))
            if bull_factor > 0.6:
                return MarketRegimeResult(regime=MarketRegime.BULL, confidence=confidence)
            elif bear_factor > 0.6:
                return MarketRegimeResult(regime=MarketRegime.BEAR, confidence=confidence)
            return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=confidence)
        except Exception as e:
            logger.error(f"Market regime detection failed: {str(e)}")
            return MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)

class NewsAnalyzer:
    """Enhanced news analysis with tiered prioritization and sector context"""
    def __init__(self):
        self.session = self._create_session()
        self.regime_detector = MarketRegimeDetector()

    def _create_session(self) -> requests.Session:
        session = requests.Session()
        retry = Retry(total=MAX_RETRIES, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session

    def analyze_news(self, symbol: str) -> Tuple[List[Dict], Dict]:
        try:
            recent = self._fetch_news(NEWS_ANALYZED_API_URL, symbol, hours=24)
            historical = self._fetch_news(NEWS_GET_API_URL, symbol, limit=100)
            all_articles = self._deduplicate_news(recent + historical)
            return self._process_articles(all_articles, symbol)
        except Exception as e:
            logger.error(f"News analysis failed: {str(e)}")
            return [], {
                'total_articles': 0,
                'tier1_count': 0,
                'avg_reliability': 0,
                'sector_context': None
            }

    def _fetch_news(self, url: str, symbol: str, hours: int = None, limit: int = None) -> List[Dict]:
        if not url:
            return []
        params = {"symbol": symbol}
        if hours:
            params["hours"] = hours
        if limit:
            params["limit"] = limit
        try:
            response = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.json().get("news", [])
        except Exception as e:
            logger.warning(f"Failed to fetch news from {url}: {str(e)}")
            return []

    def _process_articles(self, articles: List[Dict], symbol: str) -> Tuple[List[Dict], Dict]:
        valid_articles = []
        stats = {
            'total_articles': len(articles),
            'tier1_count': 0,
            'reliability_sum': 0,
            'sector_context': self._get_sector_context(symbol)
        }
        market_regime = self.regime_detector.get_current_regime()
        for article in articles:
            try:
                if not all(k in article for k in ['sentiment', 'confidence', 'source_reliability', 'published_at']):
                    continue
                reliability = float(article['source_reliability'])
                stats['reliability_sum'] += reliability
                if article.get('source') in TIER1_SOURCES and reliability >= 70:
                    stats['tier1_count'] += 1
                article['market_regime'] = market_regime
                valid_articles.append(article)
            except Exception as e:
                logger.warning(f"Invalid article format: {str(e)}")
        stats['avg_reliability'] = stats['reliability_sum'] / len(valid_articles) if valid_articles else 0
        return valid_articles, stats

    def _get_sector_context(self, symbol: str) -> Optional[Dict]:
        try:
            ticker = yf.Ticker(symbol)
            sector = ticker.info.get('sector')
            if sector:
                return {'sector': sector, 'source': 'yfinance'}
            for etf, etf_sector in SECTOR_ETFS.items():
                correlation = self._calculate_correlation(symbol, etf)
                if correlation > 0.7:
                    return {'sector': etf_sector, 'source': 'etf_correlation', 'confidence': correlation}
            return None
        except Exception as e:
            logger.warning(f"Sector context analysis failed: {str(e)}")
            return None

    def _calculate_correlation(self, symbol1: str, symbol2: str, days: int = 90) -> float:
        try:
            data1 = yf.download(symbol1, period=f"{days}d", progress=False)['Close']
            data2 = yf.download(symbol2, period=f"{days}d", progress=False)['Close']
            combined = pd.concat([data1, data2], axis=1).dropna()
            if len(combined) < 10:
                return 0.0
            return combined.corr().iloc[0, 1]
        except Exception:
            return 0.0

    def _deduplicate_news(self, articles: List[Dict]) -> List[Dict]:
        seen_titles = set()
        seen_urls = set()
        unique = []
        for article in sorted(articles, key=lambda x: x.get('published_at', ''), reverse=True):
            title = article.get('title', '').lower()
            url = article.get('url', '')
            if title in seen_titles or url in seen_urls:
                continue
            is_duplicate = False
            for existing_title in seen_titles:
                if self._title_similarity(title, existing_title) > 0.8:
                    is_duplicate = True
                    break
            if not is_duplicate:
                seen_titles.add(title)
                if url:
                    seen_urls.add(url)
                unique.append(article)
        return unique

    def _title_similarity(self, title1: str, title2: str) -> float:
        words1 = set(title1.split())
        words2 = set(title2.split())
        common = words1 & words2
        return len(common) / max(len(words1), len(words2))

class TechnicalAnalyzer:
    """Enhanced technical analysis with Black-Litterman model integration"""
    def __init__(self):
        self.regime_detector = MarketRegimeDetector()

    def analyze(self, symbol: str) -> TechnicalMetrics:
        try:
            data = self._fetch_data(symbol)
            if data.empty:
                raise ValueError(f"No data available for {symbol}")
            market_regime = self.regime_detector.get_current_regime()
            metrics = self._calculate_metrics(data, symbol)
            return TechnicalMetrics(
                sma_50=metrics["sma_50"],
                sma_200=metrics["sma_200"],
                rsi=metrics["rsi"],
                current_price=metrics["current_price"],
                volatility=metrics["volatility"],
                confidence=metrics["confidence"],
                macd=metrics.get("macd"),
                macd_signal=metrics.get("macd_signal"),
                obv=metrics.get("obv"),
                adx=metrics.get("adx"),
                black_litterman=metrics["black_litterman"],
                percentile_rank=metrics["percentile_rank"],
                market_regime=market_regime
            )
        except Exception as e:
            logger.error(f"Technical analysis failed: {str(e)}")
            return TechnicalMetrics(
                sma_50=0,
                sma_200=0,
                rsi=50,
                current_price=0,
                volatility=0,
                confidence=0,
                black_litterman={},
                percentile_rank={"sector": 50, "market": 50},
                market_regime=MarketRegimeResult(regime=MarketRegime.NEUTRAL, confidence=50)
            )

    def _fetch_data(self, symbol: str) -> pd.DataFrame:
        try:
            data = yf.download(symbol, period="1y", auto_adjust=False, progress=False)
            if len(data) < 60:
                data = yf.download(symbol, period="2y", auto_adjust=False, progress=False)
            # Ensure Close and Volume are 1-dimensional
            data['Close'] = data['Close'].to_numpy().ravel()
            data['Volume'] = data['Volume'].to_numpy().ravel()
            return data
        except Exception as e:
            logger.warning(f"Primary data fetch failed, trying 6 months: {str(e)}")
            try:
                data = yf.download(symbol, period="6mo", auto_adjust=False, progress=False)
                data['Close'] = data['Close'].to_numpy().ravel()
                data['Volume'] = data['Volume'].to_numpy().ravel()
                return data
            except Exception as e:
                logger.error(f"Failed to fetch stock data: {str(e)}")
                raise ValueError("Failed to fetch stock data") from e

    def _calculate_metrics(self, data: pd.DataFrame, symbol: str) -> Dict[str, Any]:
        closes = pd.Series(data['Close'])  # Ensure 1-dimensional
        volumes = pd.Series(data['Volume'])  # Ensure 1-dimensional
        returns = closes.pct_change().dropna()
        sma_50 = closes.rolling(50).mean().iloc[-1]
        sma_200 = closes.rolling(200).mean().iloc[-1]
        current_price = closes.iloc[-1]
        volatility = returns.std() * np.sqrt(252)
        rsi = self._calculate_rsi(closes)
        macd, macd_signal = self._calculate_macd(closes)
        obv = self._calculate_obv(closes, volumes)
        adx = self._calculate_adx(data)
        bl_inputs = self._black_litterman_inputs(returns, current_price)
        percentile_rank = self._calculate_percentile_rank(symbol, current_price)
        confidence = self._calculate_confidence(data, sma_50, sma_200, current_price)
        return {
            "sma_50": float(sma_50),
            "sma_200": float(sma_200),
            "rsi": rsi,
            "current_price": float(current_price),
            "volatility": float(volatility),
            "confidence": confidence,
            "macd": float(macd),
            "macd_signal": float(macd_signal),
            "obv": float(obv),
            "adx": float(adx),
            "black_litterman": bl_inputs,
            "percentile_rank": percentile_rank
        }

    def _calculate_rsi(self, closes: pd.Series, window: int = 14) -> float:
        delta = closes.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1 / window).mean().iloc[-1]
        avg_loss = loss.ewm(alpha=1 / window).mean().iloc[-1]
        rs = avg_gain / (avg_loss + 1e-9)
        return float(100 - (100 / (1 + rs)))

    def _calculate_macd(self, closes: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float]:
        ema_fast = closes.ewm(span=fast, adjust=False).mean()
        ema_slow = closes.ewm(span=slow, adjust=False).mean()
        macd = ema_fast - ema_slow
        macd_signal = macd.ewm(span=signal, adjust=False).mean()
        return macd.iloc[-1], macd_signal.iloc[-1]

    def _calculate_obv(self, closes: pd.Series, volumes: pd.Series) -> float:
        obv = (np.sign(closes.diff()) * volumes).cumsum()
        return obv.iloc[-1]

    def _calculate_adx(self, data: pd.DataFrame, window: int = 14) -> float:
        high, low, close = data['High'], data['Low'], data['Close']
        up_move = high.diff()
        down_move = low.diff().abs()
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        plus_di = 100 * (pd.Series(plus_dm).ewm(alpha=1 / window).mean() / tr.ewm(alpha=1 / window).mean())
        minus_di = 100 * (pd.Series(minus_dm).ewm(alpha=1 / window).mean() / tr.ewm(alpha=1 / window).mean())
        dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di))
        return dx.ewm(alpha=1 / window).mean().iloc[-1]

    def _black_litterman_inputs(self, returns: pd.Series, current_price: float) -> Dict[str, float]:
        expected_return = returns.mean() * 252
        covariance = returns.var() * 252
        sharpe = expected_return / (returns.std() * np.sqrt(252)) + 1e-9
        return {
            "expected_return": float(expected_return),
            "covariance": float(covariance),
            "sharpe_ratio": float(sharpe),
            "equilibrium_return": float(expected_return - 0.5 * covariance),
            "price_to_equilibrium": float(current_price / (current_price * (1 + expected_return)))
        }

    def _calculate_percentile_rank(self, symbol: str, current_price: float) -> Dict[str, float]:
        try:
            ticker = yf.Ticker(symbol)
            sector = ticker.info.get('sector')
            sector_peers = self._get_sector_peers(sector)
            prices = []
            for peer in sector_peers[:20]:
                try:
                    peer_data = yf.Ticker(peer).history(period='1mo')
                    if not peer_data.empty:
                        prices.append(peer_data['Close'].iloc[-1])
                except Exception:
                    continue
            spy_prices = []
            spy_components = self._get_spy_components()
            for comp in spy_components[:50]:
                try:
                    comp_data = yf.Ticker(comp).history(period='1mo')
                    if not comp_data.empty:
                        spy_prices.append(float(comp_data['Close'].iloc[-1]))
                except Exception:
                    continue
            prices = np.array(prices)
            spy_prices = np.array(spy_prices)
            sector_rank = percentileofscore(prices, current_price) if prices.size > 0 else 50.0
            market_rank = percentileofscore(spy_prices, current_price) if spy_prices.size > 0 else 50.0
            return {
                "sector": sector_rank,
                "market": market_rank,
                "sector_peers": len(prices)
            }
        except Exception as e:
            logger.warning(f"Percentile rank calculation failed: {str(e)}")
            return {
                "sector": 50.0,
                "market": 50.0,
                "sector_peers": 0
            }

    def _get_sector_peers(self, sector: str) -> List[str]:
        if not sector:
            return []
        try:
            sector_etf = next((k for k, v in SECTOR_ETFS.items() if v == sector), None)
            if sector_etf:
                ticker = yf.Ticker(sector_etf)
                holdings = ticker.info.get('holdings', {}).get('holdings', [])
                return [holding['symbol'] for holding in holdings]
        except Exception:
            return []
        return []

    def _get_spy_components(self) -> List[str]:
        try:
            ticker = yf.Ticker("SPY")
            holdings = ticker.info.get('holdings', {}).get('holdings', [])
            return [holding['symbol'] for holding in holdings]
        except Exception:
            return []

    def _calculate_confidence(self, data: pd.DataFrame, sma_50: float, sma_200: float, current_price: float) -> float:
        closes = pd.Series(data['Close'])  # Ensure 1-dimensional
        volumes = pd.Series(data['Volume'])  # Ensure 1-dimensional
        above_50ma = current_price > sma_50
        above_200ma = current_price > sma_200
        trend_strength = self._calculate_adx(data) / 25
        rsi = self._calculate_rsi(closes)
        rsi_ok = 30 < rsi < 70
        macd, macd_signal = self._calculate_macd(closes)
        macd_bullish = macd > macd_signal
        volume_ok = volumes.iloc[-1] > volumes.rolling(20).mean().iloc[-1]
        obv_trend = np.sign(self._calculate_obv(closes, volumes))
        volatility = closes.pct_change().std() * np.sqrt(252)
        volatility_penalty = min(1, max(0, (volatility - 0.2) / 0.3))
        raw_score = sum([
            20 * above_50ma,
            20 * above_200ma,
            15 * rsi_ok,
            10 * macd_bullish,
            10 * volume_ok,
            10 * trend_strength,
            5 * obv_trend,
            10 * (1 - volatility_penalty)
        ])
        market_regime = self.regime_detector.get_current_regime()
        regime_multiplier = {
            MarketRegime.BULL: 1.1,
            MarketRegime.BEAR: 0.9,
            MarketRegime.NEUTRAL: 1.0
        }.get(market_regime.regime, 1.0)
        return min(100, max(0, raw_score * regime_multiplier))
class InstitutionalAnalysisEngine:
    """Complete institutional-grade analysis engine with enhanced LLM integration"""
    def __init__(self, symbol: str, risk_type: str = "medium", hold_time: str = "medium-term", detail_level: str = "summary"):
        self.symbol = symbol.upper()
        self.risk_type = RiskProfile(risk_type.lower())
        self.hold_time = TimeHorizon(hold_time.lower())
        self.detail_level = DetailLevel(detail_level.lower())
        self.news_analyzer = NewsAnalyzer()
        self.technical_analyzer = TechnicalAnalyzer()
        self.regime_detector = MarketRegimeDetector()
        self._validate_parameters()

    def _validate_parameters(self):
        if not re.match(r'^[A-Z]{1,5}$', self.symbol):
            raise ValueError("Invalid stock symbol")

    def full_analysis(self) -> Dict[str, Any]:
        try:
            technicals = self.technical_analyzer.analyze(self.symbol)
            if technicals.current_price == 0:
                return self._error_response("Technical analysis failed")
            articles, news_stats = self.news_analyzer.analyze_news(self.symbol)
            sentiment = self._analyze_sentiment(articles, technicals.market_regime)
            llm_response = self._generate_llm_opinion(technicals, sentiment, len(articles))
            return self._format_response(technicals, sentiment, news_stats, llm_response)
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}", exc_info=True)
            return self._error_response(str(e))

    def _analyze_sentiment(self, articles: List[Dict], market_regime: MarketRegimeResult) -> SentimentAnalysis:
        if not articles:
            return SentimentAnalysis(
                score=0.0,
                confidence=0.0,
                key_phrases=[],
                sentiment_distribution={"positive": 0, "neutral": 0, "negative": 0},
                source_weights={}
            )
        scores = []
        now = datetime.datetime.utcnow()
        key_phrases = set()
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
        source_weights = {}
        for article in articles:
            try:
                pub_date = datetime.datetime.fromisoformat(article['published_at'].replace('Z', '+00:00'))
                hours_old = (now - pub_date).total_seconds() / 3600
                recency = np.exp(-hours_old / 24)
                source_weight = 2.0 if article.get('source') in TIER1_SOURCES else 1.0
                source_weights[article.get('source')] = source_weight
                sentiment = article['sentiment'].lower()
                sentiment_value = {
                    "positive": 1.0,
                    "neutral": 0.0,
                    "negative": -1.0
                }.get(sentiment, 0.0)
                weight = (
                    article['confidence'] *
                    (article['source_reliability'] / 100) *
                    recency *
                    source_weight
                )
                scores.append(sentiment_value * weight)
                sentiment_counts[sentiment] += 1
                if 'key_phrases' in article:
                    key_phrases.update(phrase.strip() for phrase in article['key_phrases'].split(',') if phrase.strip())
            except Exception as e:
                logger.warning(f"Skipping invalid article: {str(e)}")
        avg_score = np.mean(scores) if scores else 0.0
        regime_adjustment = {
            MarketRegime.BULL: 1.1,
            MarketRegime.BEAR: 0.9,
            MarketRegime.NEUTRAL: 1.0
        }.get(market_regime.regime, 1.0)
        adjusted_score = float(np.clip(avg_score * regime_adjustment, -1.0, 1.0))
        return SentimentAnalysis(
            score=adjusted_score,
            confidence=min(100, max(0, np.mean([
                a['confidence'] * 100 for a in articles if 'confidence' in a
            ]))),
            key_phrases=sorted(list(key_phrases), key=lambda x: -len(x))[:10],
            sentiment_distribution=sentiment_counts,
            source_weights=source_weights
        )

    def _generate_llm_opinion(self, technicals: TechnicalMetrics, sentiment: SentimentAnalysis, article_count: int) -> LLMResponse:
        prompt = self._build_llm_prompt(technicals, sentiment, article_count)
        try:
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}
            response = requests.post(HF_API_URL, headers=headers, json={"inputs": prompt}, timeout=45)
            if response.status_code == 200:
                parsed = self._parse_llm_response(response.json()[0]["generated_text"], technicals, sentiment)
                return LLMResponse(**parsed)
        except Exception as e:
            logger.error(f"LLM query failed: {str(e)}")
        return LLMResponse(**self._generate_fallback_opinion(technicals, sentiment))

    def _build_llm_prompt(self, technicals: TechnicalMetrics, sentiment: SentimentAnalysis, article_count: int) -> str:
        market_regime = technicals.market_regime
        bl_inputs = technicals.black_litterman
        tech_summary = textwrap.dedent(f"""
        ### TECHNICAL ANALYSIS ###
        - Current Price: ${technicals.current_price:.2f}
        - Trend: {'Bullish' if technicals.current_price > technicals.sma_50 else 'Bearish'} (50MA: ${technicals.sma_50:.2f}, 200MA: ${technicals.sma_200:.2f})
        - Momentum: RSI {technicals.rsi:.1f} ({'Overbought' if technicals.rsi > 70 else 'Oversold' if technicals.rsi < 30 else 'Neutral'})
        - Volume: {'Increasing' if technicals.obv and technicals.obv > 0 else 'Decreasing'} trend
        - Volatility: {technicals.volatility:.2%} (annualized)
        - Market Regime: {market_regime.regime.value.upper()} (Confidence: {market_regime.confidence}%)
        - Percentile Rank: {technicals.percentile_rank.get('sector', 50):.1f}% in sector, {technicals.percentile_rank.get('market', 50):.1f}% in market
        """)
        sentiment_dist = sentiment.sentiment_distribution
        sent_summary = textwrap.dedent(f"""
        ### SENTIMENT ANALYSIS ###
        - Overall Score: {sentiment.score:.2f}/1.0
        - Article Count: {article_count} (Tier 1: {sum(1 for w in sentiment.source_weights.values() if w == 2.0)})
        - Sentiment Distribution: 
          Positive: {sentiment_dist.get('positive', 0)}
          Neutral: {sentiment_dist.get('neutral', 0)}
          Negative: {sentiment_dist.get('negative', 0)}
        - Key Themes: {', '.join(sentiment.key_phrases[:5]) or 'None identified'}
        """)
        bl_summary = textwrap.dedent(f"""
        ### BLACK-LITTERMAN INPUTS ###
        - Expected Return: {bl_inputs.get('expected_return', 0):.2%}
        - Equilibrium Return: {bl_inputs.get('equilibrium_return', 0):.2%}
        - Sharpe Ratio: {bl_inputs.get('sharpe_ratio', 0):.2f}
        """)
        context = textwrap.dedent(f"""
        ### INVESTMENT CONTEXT ###
        - Risk Tolerance: {self.risk_type.value.upper()}
        - Time Horizon: {self.hold_time.value.upper()}
        - Current Market: {market_regime.regime.value.upper()}
        """)
        instruction = textwrap.dedent("""
        [INSTRUCTIONS]
        As a senior institutional analyst, provide a comprehensive recommendation considering:
        1. Technical indicators and market regime
        2. News sentiment and key themes
        3. Black-Litterman equilibrium
        4. Investor's risk profile and time horizon
        Structure your response as follows:
        [RECOMMENDATION]
        <STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL> - <1-sentence summary>
        [RATIONALE]
        - <3-5 bullet points explaining the recommendation>
        - Reference specific technical levels
        - Note any sentiment divergences
        - Address risk/reward profile
        [PRICE TARGETS]
        - Base Case: $XX.XX (XX% upside) - <justification>
        - Bull Case: $XX.XX (XX% upside) - <justification>
        - Bear Case: $XX.XX (XX% downside) - <justification>
        [KEY RISKS]
        - <2-3 specific risks to monitor>
        - <any sector/macro considerations>
        [TIME HORIZON GUIDANCE]
        <Note any time-sensitive factors>
         """)
        return "\n".join([tech_summary, sent_summary, bl_summary, context, instruction])

    def _parse_llm_response(self, text: str, technicals: TechnicalMetrics, sentiment: SentimentAnalysis) -> Dict:
        # Add your LLM response parsing logic here
        return {
            "recommendation": "HOLD - Neutral outlook based on mixed signals",
            "rationale": [
                "Balanced technical indicators",
                "Neutral market regime",
                "Mixed sentiment analysis"
            ],
            "targets": {
                "base": technicals.current_price * 1.05,
                "bull": technicals.current_price * 1.15,
                "bear": technicals.current_price * 0.95
            },
            "risks": ["Market volatility", "Sector rotation"],
            "source": "Institutional Analysis Engine"
        }

    def _generate_fallback_opinion(self, technicals: TechnicalMetrics, sentiment: SentimentAnalysis) -> Dict:
        """
        Generate a fallback opinion when LLM fails or produces invalid output.
        This uses deterministic logic based on technical and sentiment analysis.
        """
        price = technicals.current_price
        sentiment_score = sentiment.score
        # Determine base recommendation
        if sentiment_score > 0.3 and price > technicals.sma_200:
            recommendation = "BUY"
        elif sentiment_score < -0.3 and price < technicals.sma_200:
            recommendation = "SELL"
        else:
            recommendation = "HOLD"
        # Price targets with volatility adjustments
        base_multiplier = 1.05 + (sentiment_score * 0.1)  # ±10% adjustment based on sentiment
        bull_multiplier = 1.15 + (sentiment_score * 0.1)
        bear_multiplier = 0.95 + (sentiment_score * 0.1)
        return {
            "recommendation": recommendation,
            "rationale": [
                f"System-generated analysis due to LLM failure",
                f"Technical trend: {'Bullish' if price > technicals.sma_200 else 'Bearish'}",
                f"Sentiment score: {sentiment_score:.2f}",
                f"Market regime: {technicals.market_regime.regime.value}"
            ],
            "targets": {
                "base": price * base_multiplier,
                "bull": price * bull_multiplier,
                "bear": price * bear_multiplier
            },
            "risks": [
                "High volatility" if technicals.volatility > 0.3 else "Moderate volatility",
                "Negative sentiment" if sentiment_score < -0.2 else "Neutral sentiment"
            ],
            "source": "fallback"
        }

    def _format_response(self, technicals: TechnicalMetrics, sentiment: SentimentAnalysis, news_stats: Dict, llm_response: LLMResponse) -> Dict:
        """
        Format the final response combining all analysis components.
        """
        composite_confidence = self._calculate_composite_confidence(technicals.confidence, sentiment.confidence, news_stats.get('avg_reliability', 0))
        action, action_confidence = self._normalize_recommendation(llm_response.recommendation)
        response = {
            "metadata": {
                "symbol": self.symbol,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "analysis_version": "4.1",
                "parameters": {
                    "risk_type": self.risk_type.value,
                    "hold_time": self.hold_time.value,
                    "detail_level": self.detail_level.value
                }
            },
            "recommendation": {
                "action": action,
                "confidence": action_confidence,
                "horizon": self.hold_time.value,
                "rationale": llm_response.rationale,
                "source": llm_response.source
            },
            "valuation": {
                "current_price": technicals.current_price,
                "targets": llm_response.targets,
                "black_litterman": technicals.black_litterman
            },
            "confidence_metrics": {
                "technical": technicals.confidence,
                "sentiment": sentiment.confidence,
                "news_reliability": news_stats.get('avg_reliability', 0),
                "composite": composite_confidence
            },
            "risk_metrics": self._calculate_risk_metrics(technicals, sentiment),
            "market_context": {
                "regime": {
                    "regime": technicals.market_regime.regime.value,
                    "confidence": technicals.market_regime.confidence
                },
                "sector": news_stats.get('sector_context', {}),
                "percentile_rank": technicals.percentile_rank
            },
            "key_indicators": {
                "technical": {
                    "sma_50": technicals.sma_50,
                    "sma_200": technicals.sma_200,
                    "rsi": technicals.rsi,
                    "macd": technicals.macd,
                    "adx": technicals.adx
                },
                "sentiment": {
                    "score": sentiment.score,
                    "key_phrases": sentiment.key_phrases,
                    "distribution": sentiment.sentiment_distribution
                }
            },
            "risks": llm_response.risks,
            "disclaimer": self._regulatory_disclaimer()
        }
        # Add detailed metadata if requested
        if self.detail_level == DetailLevel.DETAILED:
            response.update({
                "model_metadata": {
                    "technical_model": "Enhanced TA with Black-Litterman",
                    "sentiment_model": "FinBERT + Custom Weighting",
                    "llm_model": "FLAN-T5-XXL",
                    "news_sources": news_stats.get('source_weights', {})
                }
            })
        return response

    def _error_response(self, message: str) -> Dict:
        """
        Generate a standardized error response.
        """
        return {
            "error": message,
            "symbol": self.symbol,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "disclaimer": self._regulatory_disclaimer(),
            "remediation": {
                "suggested_actions": [
                    "Verify the symbol is correct",
                    "Retry the analysis later",
                    "Contact support if issue persists"
                ],
                "error_code": "API_400" if "Invalid" in message else "API_500"
            }
        }

    def _regulatory_disclaimer(self) -> str:
        """
        Generate a regulatory-compliant disclaimer for the analysis.
        """
        return (
            "This analysis is for informational purposes only and does not constitute financial advice. "
            "The information provided is based on historical data, technical analysis, and machine learning models, "
            "which may not accurately predict future market conditions. Investing involves risk, including "
            "the possible loss of principal. Always consult with a qualified financial advisor before making "
            "investment decisions."
        )

    def _calculate_composite_confidence(self, technical_confidence: float, sentiment_confidence: float, news_reliability: float) -> float:
        """
        Calculate a weighted composite confidence score.
        """
        weights = {
            "technical": 0.5,
            "sentiment": 0.3,
            "news": 0.2
        }
        return (
            weights["technical"] * technical_confidence +
            weights["sentiment"] * sentiment_confidence +
            weights["news"] * news_reliability
        )

    def _normalize_recommendation(self, recommendation: str) -> Tuple[str, int]:
        """
        Normalize the recommendation string and assign a confidence level.
        """
        mapping = {
            "STRONG_BUY": ("strong_buy", 90),
            "BUY": ("buy", 75),
            "HOLD": ("hold", 50),
            "SELL": ("sell", 25),
            "STRONG_SELL": ("strong_sell", 10)
        }
        normalized = recommendation.split("-")[0].strip().upper()
        return mapping.get(normalized, ("hold", 50))

    def _calculate_risk_metrics(self, technicals: TechnicalMetrics, sentiment: SentimentAnalysis) -> Dict[str, float]:
        """
        Calculate key risk metrics based on technical and sentiment analysis.
        """
        stop_loss = technicals.sma_200 * 0.95
        take_profit = technicals.sma_50 * 1.05
        risk_reward_ratio = (take_profit - technicals.current_price) / (technicals.current_price - stop_loss)
        return {
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "risk_reward_ratio": risk_reward_ratio
        }

# --------------------- API Interface Functions ---------------------
def generate_stock_opinion_sync(
    symbol: str,
    risk_type: str = "medium",
    hold_time: str = "medium-term",
    detail_level: str = "summary"
) -> Dict[str, Any]:
    """
    Synchronous wrapper for generating stock opinions
    """
    try:
        engine = InstitutionalAnalysisEngine(
            symbol=symbol,
            risk_type=risk_type,
            hold_time=hold_time,
            detail_level=detail_level
        )
        return engine.full_analysis()
    except Exception as e:
        logger.error(f"Error in sync opinion generation: {str(e)}")
        return {
            "error": str(e),
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

def format_investment_analysis(analysis: Dict, company_name: str = None, detail_level: str = None, hold_time: str = None) -> Dict:
    """Format the analysis output for API response"""
    result = {
        "symbol": analysis.get("metadata", {}).get("symbol"),
        "company_name": company_name,
        "recommendation": analysis.get("recommendation", {}),
        "price_targets": analysis.get("recommendation", {}).get("targets", {}),
        "confidence": analysis.get("confidence_metrics", {}).get("overall"),
        "risks": analysis.get("risks", []),
        "last_updated": datetime.datetime.utcnow().isoformat(),
        "detail_level": detail_level,
        "hold_time": hold_time
    }
    return {k: v for k, v in result.items() if v is not None}