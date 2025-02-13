# news/finbert_sentiment.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch
import logging
from functools import lru_cache
from django.core.cache import cache
from django.conf import settings

# Configure logging
logger = logging.getLogger(__name__)

# Constants
RATE_LIMIT_KEY = "finbert_rate_limit"
RATE_LIMIT_PERIOD = 60  # 60 seconds
RATE_LIMIT_MAX_REQUESTS = 100  # Max requests per minute

# Load model and tokenizer with caching
@lru_cache(maxsize=1)
def load_model():
    """Load and cache the FinBERT model and tokenizer."""
    try:
        model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
        tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        return model, tokenizer
    except Exception as e:
        logger.error(f"Failed to load FinBERT model: {str(e)}")
        raise

# Initialize pipeline with error handling
try:
    model, tokenizer = load_model()
    nlp = pipeline(
        "sentiment-analysis",
        model=model,
        tokenizer=tokenizer,
        device=0 if torch.cuda.is_available() else -1  # Use GPU if available
    )
except Exception as e:
    logger.error(f"Failed to initialize sentiment analysis pipeline: {str(e)}")
    nlp = None

def warmup_model():
    """Warm up the model by running a dummy analysis."""
    if nlp is not None:
        try:
            analyze_sentiment("Warming up FinBERT model")
            logger.info("FinBERT model warmed up successfully")
        except Exception as e:
            logger.error(f"Failed to warm up model: {str(e)}")

def check_rate_limit():
    """Check and enforce rate limiting."""
    current_count = cache.get(RATE_LIMIT_KEY, 0)
    if current_count >= RATE_LIMIT_MAX_REQUESTS:
        logger.warning("Rate limit exceeded for sentiment analysis")
        return False
    cache.set(RATE_LIMIT_KEY, current_count + 1, RATE_LIMIT_PERIOD)
    return True

def analyze_sentiment(text, max_length=512):
    """
    Analyze financial text sentiment using FinBERT.
    
    Args:
        text (str): Input text to analyze.
        max_length (int): Maximum token length for truncation.
        
    Returns:
        dict: Sentiment analysis results with scores.
              Format: {
                  'dominant_sentiment': str,
                  'compound_score': float,
                  'scores': dict,
                  'error': str (optional)
              }
    """
    # Check rate limit
    if not check_rate_limit():
        return {
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': 'Rate limit exceeded'
        }

    if not text or not isinstance(text, str):
        logger.warning("Empty or invalid text input received")
        return {
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': 'Invalid input'
        }

    if nlp is None:
        logger.error("Sentiment analysis pipeline not available")
        return {
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': 'Model not loaded'
        }

    try:
        # Truncate text if necessary
        if len(text) > max_length * 4:  # Approximate character count
            logger.debug(f"Truncating long text from {len(text)} characters")
            text = text[:max_length * 4]

        # Perform sentiment analysis
        results = nlp(text, truncation=True, max_length=max_length)
        
        # Aggregate scores
        sentiment_scores = {'positive': 0, 'negative': 0, 'neutral': 0}
        for result in results:
            label = result['label'].lower()
            if label in sentiment_scores:
                sentiment_scores[label] += result['score']
        
        # Normalize scores
        total = sum(sentiment_scores.values())
        if total == 0:
            return {
                'dominant_sentiment': 'neutral',
                'compound_score': 0,
                'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
                'error': 'No valid sentiment scores'
            }
        
        # Calculate compound score
        compound = (sentiment_scores['positive'] - sentiment_scores['negative']) / total
        
        return {
            'dominant_sentiment': max(sentiment_scores, key=sentiment_scores.get),
            'compound_score': compound,
            'scores': {k: v / total for k, v in sentiment_scores.items()}
        }
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {str(e)}", exc_info=True)
        return {
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': str(e)
        }

def analyze_sentiment_batch(texts, max_length=512):
    """
    Analyze sentiment for a batch of texts.
    
    Args:
        texts (list): List of texts to analyze.
        max_length (int): Maximum token length for truncation.
        
    Returns:
        list: List of sentiment analysis results.
    """
    if not isinstance(texts, list):
        logger.warning("Invalid input: expected list of texts")
        return []

    if nlp is None:
        logger.error("Sentiment analysis pipeline not available")
        return [{
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': 'Model not loaded'
        } for _ in texts]

    try:
        # Truncate texts if necessary
        truncated_texts = [
            text[:max_length * 4] if len(text) > max_length * 4 else text
            for text in texts
        ]

        # Perform batch analysis
        results = nlp(truncated_texts, truncation=True, max_length=max_length, batch_size=8)
        
        # Process results
        batch_results = []
        for result in results:
            sentiment_scores = {'positive': 0, 'negative': 0, 'neutral': 0}
            for item in result:
                label = item['label'].lower()
                if label in sentiment_scores:
                    sentiment_scores[label] += item['score']
            
            total = sum(sentiment_scores.values())
            compound = (sentiment_scores['positive'] - sentiment_scores['negative']) / total if total != 0 else 0
            
            batch_results.append({
                'dominant_sentiment': max(sentiment_scores, key=sentiment_scores.get),
                'compound_score': compound,
                'scores': {k: v / total for k, v in sentiment_scores.items()}
            })
        
        return batch_results
        
    except Exception as e:
        logger.error(f"Batch sentiment analysis failed: {str(e)}", exc_info=True)
        return [{
            'dominant_sentiment': 'neutral',
            'compound_score': 0,
            'scores': {'positive': 0, 'negative': 0, 'neutral': 1},
            'error': str(e)
        } for _ in texts]