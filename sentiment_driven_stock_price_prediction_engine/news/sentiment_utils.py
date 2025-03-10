import re
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor

# Load the FINBERT model (or an alternative context-aware model)
tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")
model = AutoModelForSequenceClassification.from_pretrained("yiyanghkust/finbert-tone")

def clean_text(text: str) -> str:
    """
    Clean and preprocess text by removing noise, URLs, and special characters.
    
    Args:
        text (str): Input text to clean.
    
    Returns:
        str: Cleaned text.
    """
    # Remove URLs
    text = re.sub(r"http\S+", "", text)
    # Remove special characters except alphanumeric, spaces, commas, and periods
    text = re.sub(r"[^A-Za-z0-9\s.,]", "", text)
    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def analyze_sentiment(text: str) -> Tuple[str, float]:
    """
    Analyze the sentiment of a single text using FINBERT.
    
    Args:
        text (str): Input text to analyze.
    
    Returns:
        Tuple[str, float]: Sentiment label ("negative", "neutral", "positive") and confidence score (0-1).
    """
    try:
        text = clean_text(text)
        if not text:
            return "neutral", 0.5  # Default for empty text

        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
        scores = torch.softmax(outputs.logits, dim=1).detach().numpy()[0]
        
        # Labels: [negative, neutral, positive]
        label_index = scores.argmax()
        labels = ["negative", "neutral", "positive"]
        sentiment = labels[label_index]
        confidence = float(scores[label_index])
        
        return sentiment, confidence
    except Exception as e:
        print(f"Error analyzing sentiment: {str(e)}")
        return "neutral", 0.5  # Fallback for errors

def analyze_sentiment_batch(texts: List[str]) -> List[Tuple[str, float]]:
    """
    Analyze sentiment for a batch of texts using multithreading.
    
    Args:
        texts (List[str]): List of input texts to analyze.
    
    Returns:
        List[Tuple[str, float]]: List of sentiment labels and confidence scores.
    """
    with ThreadPoolExecutor() as executor:
        results = list(executor.map(analyze_sentiment, texts))
    return results

def context_aware_adjustment(text: str, sentiment: str, confidence: float) -> Tuple[str, float]:
    """
    Adjust sentiment and confidence based on context (e.g., sarcasm, negations).
    
    Args:
        text (str): Input text.
        sentiment (str): Original sentiment label.
        confidence (float): Original confidence score.
    
    Returns:
        Tuple[str, float]: Adjusted sentiment label and confidence score.
    """
    try:
        text_lower = text.lower()
        
        # Handle negations (e.g., "not bad" -> positive)
        if "not bad" in text_lower or "not terrible" in text_lower:
            sentiment = "positive"
            confidence = max(confidence, 0.7)
        
        # Handle sarcasm (e.g., "great job" with negative context)
        if "great job" in text_lower and sentiment == "positive":
            sentiment = "negative"
            confidence = max(confidence, 0.8)
        
        # Handle uncertainty (e.g., "might be good" -> neutral)
        if "might" in text_lower or "could" in text_lower:
            sentiment = "neutral"
            confidence = max(confidence, 0.6)
        
        return sentiment, confidence
    except Exception as e:
        print(f"Error in context-aware adjustment: {str(e)}")
        return sentiment, confidence  # Fallback to original values

def get_sentiment_summary(sentiment_results: List[Tuple[str, float]]) -> Dict[str, float]:
    """
    Aggregate sentiment results into a summary.
    
    Args:
        sentiment_results (List[Tuple[str, float]]): List of sentiment labels and confidence scores.
    
    Returns:
        Dict[str, float]: Summary of sentiment distribution (e.g., {"positive": 0.6, "neutral": 0.3, "negative": 0.1}).
    """
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    total = len(sentiment_results)
    
    for sentiment, confidence in sentiment_results:
        sentiment_counts[sentiment] += 1
    
    return {
        "positive": sentiment_counts["positive"] / total,
        "neutral": sentiment_counts["neutral"] / total,
        "negative": sentiment_counts["negative"] / total,
    }

def analyze_news_articles(articles: List[Dict[str, str]]) -> Dict[str, float]:
    """
    Analyze sentiment for a list of news articles.
    
    Args:
        articles (List[Dict[str, str]]): List of articles with "title" and "content" fields.
    
    Returns:
        Dict[str, float]: Summary of sentiment distribution.
    """
    try:
        texts = [f"{article['title']}. {article['content']}" for article in articles]
        sentiment_results = analyze_sentiment_batch(texts)
        
        # Apply context-aware adjustments
        adjusted_results = [
            context_aware_adjustment(text, sentiment, confidence)
            for text, (sentiment, confidence) in zip(texts, sentiment_results)
        ]
        
        return get_sentiment_summary(adjusted_results)
    except Exception as e:
        print(f"Error analyzing news articles: {str(e)}")
        return {"positive": 0.0, "neutral": 1.0, "negative": 0.0}  # Fallback for errors