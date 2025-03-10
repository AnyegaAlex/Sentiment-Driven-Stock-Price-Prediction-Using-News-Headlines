import os
import logging
import datetime
import requests
import numpy as np
import pandas as pd
import yfinance as yf
from transformers import pipeline
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# --- Configuration ---
NEWS_API_URL = "http://127.0.0.1:8000/api/news/analyzed/"
HF_API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-small"
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # Token should be set in environment variables

# Base weighting factors
BASE_TECHNICAL_WEIGHT = 0.4
BASE_SENTIMENT_WEIGHT = 0.4
BASE_MACRO_WEIGHT = 0.2

def get_technical_summary(symbol: str) -> Dict[str, Any]:
    """
    Fetch historical stock data for `symbol` and compute key technical indicators.
    Returns a dictionary with SMA50, SMA200, RSI, pivot, support, and resistance.
    """
    try:
        data = yf.download(symbol, period="1y", interval="1d")
        if data.empty:
            raise ValueError(f"No historical data available for symbol {symbol}")
        
        # Ensure required columns exist
        for col in ["Close", "High", "Low"]:
            if col not in data.columns:
                raise ValueError(f"Column {col} is missing in data for {symbol}")

        sma_50 = data['Close'].rolling(window=50).mean().iloc[-1]
        sma_200 = data['Close'].rolling(window=200).mean().iloc[-1]
        
        # RSI Calculation
        delta = data['Close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(14).mean()
        avg_loss = loss.rolling(14).mean()
        # Avoid division by zero
        rs = avg_gain / (avg_loss + 1e-6)
        rsi = 100 - (100 / (1 + rs))
        rsi_value = rsi.iloc[-1]
        
        # Pivot, Support, Resistance calculation
        pivot = (data['High'].iloc[-1] + data['Low'].iloc[-1] + data['Close'].iloc[-1]) / 3
        resistance = 2 * pivot - data['Low'].iloc[-1]
        support = 2 * pivot - data['High'].iloc[-1]
        
        technical_summary = {
            "sma_50": float(sma_50),
            "sma_200": float(sma_200),
            "rsi": float(rsi_value),
            "pivot": float(pivot),
            "support": float(support),
            "resistance": float(resistance)
        }
        logger.info(f"Technical summary for {symbol}: {technical_summary}")
        return technical_summary
    except Exception as e:
        logger.error(f"Error computing technical summary for {symbol}", exc_info=e)
        raise

def get_news_data(symbol: str) -> List[Dict[str, Any]]:
    """
    Retrieve processed news data for `symbol` from the news endpoint.
    Returns a list of news articles (or an empty list if errors occur).
    """
    try:
        response = requests.get(NEWS_API_URL, params={"symbol": symbol}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            logger.info(f"News data retrieved for {symbol}")
            return data.get("news", [])
        else:
            logger.error(f"News API error for {symbol}: {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Error fetching news data for {symbol}", exc_info=e)
        return []

def aggregate_sentiment(news_list: List[Dict[str, Any]]) -> float:
    """
    Compute a weighted aggregate sentiment score from multiple news articles.
    Returns a score between -1 and 1.
    """
    try:
        if not news_list:
            return 0.0
        
        total_weight = 0.0
        weighted_sentiment = 0.0
        now = datetime.datetime.utcnow()

        for article in news_list:
            # Get sentiment, confidence, reliability, and published date safely
            sentiment = str(article.get("sentiment", "neutral")).lower()
            confidence = float(article.get("confidence", 0))
            reliability = float(article.get("source_reliability", 50)) / 100.0
            published_at = article.get("published_at", "")
            try:
                published_date = datetime.datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                delta_hours = (now - published_date).total_seconds() / 3600
                recency_weight = np.exp(-delta_hours / 24)
            except Exception:
                recency_weight = 1.0
            volume_weight = float(article.get("volume_weight", 1.0))
            weight = reliability * recency_weight * volume_weight

            if sentiment == "positive":
                weighted_sentiment += confidence * weight
            elif sentiment == "negative":
                weighted_sentiment -= confidence * weight

            total_weight += weight

        aggregate = weighted_sentiment / total_weight if total_weight else 0.0
        logger.info(f"Aggregate sentiment for {news_list[0].get('symbol', 'N/A') if news_list else 'N/A'}: {aggregate:.2f}")
        return aggregate
    except Exception as e:
        logger.error("Error aggregating sentiment", exc_info=e)
        return 0.0

def generate_llm_opinion(symbol: str, technical: Dict[str, float], aggregate_sentiment: float, risk_type: str, hold_time: str) -> str:
    """
    Generate an AI stock opinion using a Hugging Face LLM API.
    Returns the generated text opinion or None if generation fails.
    """
    try:
        prompt = (
            "[SYSTEM PROMPT]\n"
            f"Stock: {symbol}\n"
            f"Technical Indicators: SMA50 = {technical['sma_50']:.2f}, SMA200 = {technical['sma_200']:.2f}, "
            f"RSI = {technical['rsi']:.2f}, Pivot = {technical['pivot']:.2f}, "
            f"Support = {technical['support']:.2f}, Resistance = {technical['resistance']:.2f}\n"
            f"Aggregated News Sentiment: {aggregate_sentiment:.2f}\n"
            f"User Preferences: Risk Tolerance = {risk_type}, Investment Horizon = {hold_time}\n"
            f"Constraints: Do not provide direct financial advice; include a disclaimer.\n"
            f"Provide a clear recommendation (strong buy, buy, hold, sell, strong sell) with probabilities and a brief explanation."
        )
        headers = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}
        payload = {"inputs": prompt, "options": {"wait_for_model": True}}
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and result and "generated_text" in result[0]:
                opinion_text = result[0]["generated_text"]
                logger.info("LLM generated opinion successfully.")
                return opinion_text
            else:
                logger.error("Unexpected LLM response format")
                return None
        else:
            logger.error(f"LLM API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error("Error during LLM opinion generation", exc_info=e)
        return None

def fallback_opinion(technical: Dict[str, float], aggregate_sentiment: float) -> str:
    """
    Provide a simple fallback opinion based on technical indicators and sentiment.
    Returns a recommendation string.
    """
    try:
        rsi = technical.get("rsi", 50)
        if rsi > 70 and aggregate_sentiment > 0:
            return "Hold (Warning: Overbought conditions)"
        score = (BASE_TECHNICAL_WEIGHT * (100 - rsi) +
                 BASE_SENTIMENT_WEIGHT * (aggregate_sentiment * 100)) / (BASE_TECHNICAL_WEIGHT + BASE_SENTIMENT_WEIGHT)
        if score > 60:
            return "Buy"
        elif score < 40:
            return "Sell"
        else:
            return "Hold"
    except Exception as e:
        logger.error("Error in fallback opinion generation", exc_info=e)
        return "Hold"

def generate_stock_opinion(symbol: str, detailed: bool = False, risk_type: str = "medium", hold_time: str = "medium-term") -> Dict[str, Any]:
    """
    Generate an AI stock opinion for the given symbol by integrating technical data,
    aggregated news sentiment, LLM-based recommendation, and fallback logic.
    Returns a dictionary with opinion, risk metrics, and explanations.
    """
    try:
        technical = get_technical_summary(symbol)
        news_list = get_news_data(symbol)
        agg_sentiment = aggregate_sentiment(news_list)

        # Adjust weights based on risk type
        let_tech_weight = BASE_TECHNICAL_WEIGHT
        let_sent_weight = BASE_SENTIMENT_WEIGHT
        if risk_type.lower() == "low":
            let_tech_weight += 0.1
            let_sent_weight -= 0.1
        elif risk_type.lower() == "high":
            let_tech_weight -= 0.1
            let_sent_weight += 0.1

        # Confidence scores (example values)
        technical_confidence = 80  # ideally dynamic
        sentiment_confidence = abs(agg_sentiment) * 100
        composite_confidence = (
            let_tech_weight * technical_confidence +
            let_sent_weight * sentiment_confidence +
            BASE_MACRO_WEIGHT * 70  # macro factor assumed
        )

        let_llm_opinion = generate_llm_opinion(symbol, technical, agg_sentiment, risk_type, hold_time)
        if not let_llm_opinion:
            let_llm_opinion = fallback_opinion(technical, agg_sentiment)

        let_explanation = let_llm_opinion if detailed else let_llm_opinion.split('.')[0]

        factors = {
            "technical": technical,
            "aggregated_sentiment": agg_sentiment,
            "news_count": len(news_list)
        }
        risk_metrics = {
            "stop_loss": technical["sma_200"] * 0.95,
            "take_profit": technical["sma_50"] * 1.05,
            "risk_reward_ratio": "1:3"
        }
        contrarian_warnings = []
        if technical["rsi"] > 70 and agg_sentiment > 0:
            contrarian_warnings.append("High sentiment but overbought RSI")

        opinion = {
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": let_llm_opinion.split()[0].lower(),  # Simplistic extraction
            "horizon": hold_time,
            "confidence": {
                "technical": f"{technical_confidence}%",
                "sentiment": f"{sentiment_confidence:.1f}%",
                "composite": f"{composite_confidence:.2f}%"
            },
            "factors": factors,
            "risk_metrics": risk_metrics,
            "contrarian_warnings": contrarian_warnings,
            "explanation": let_explanation,
            "news_data": news_list
        }
        return opinion
    except Exception as e:
        logger.error("Error generating stock opinion", exc_info=e)
        return {"error": str(e)}
