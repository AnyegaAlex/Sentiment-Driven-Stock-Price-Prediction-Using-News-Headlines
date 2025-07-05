from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import torch
import logging
import time
from django.conf import settings
from copy import deepcopy


# Initialize logger
logger = logging.getLogger(__name__)

# Circuit breaker fallback
try:
    from circuitbreaker import circuit
    CIRCUIT_BREAKER_AVAILABLE = True
except ImportError:
    CIRCUIT_BREAKER_AVAILABLE = False
    logger.warning("circuitbreaker package not installed - using dummy decorator")
    # Fallback circuit breaker implementation
    class circuit:
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, func):
            return func

# Default configuration for FinBERT
DEFAULT_FINBERT_CONFIG = {
    'model_name': 'ProsusAI/finbert',
    'min_text_length': 20,
    'max_text_length': 2000,
    'confidence_threshold': 0.4,
    'load_retries': 3,
    'load_retry_delay': 2,
    'circuit_breaker': {
        'failure_threshold': 3,
        'recovery_timeout': 60
    }
}

# Merge with Django settings if available
USER_CONFIG = getattr(settings, 'FINBERT_CONFIG', {})
FINBERT_CONFIG = deepcopy(DEFAULT_FINBERT_CONFIG)
FINBERT_CONFIG.update(USER_CONFIG)
if 'circuit_breaker' in USER_CONFIG:
    FINBERT_CONFIG['circuit_breaker'].update(USER_CONFIG['circuit_breaker'])

# Global variables for the model and tokenizer
TOKENIZER = None
MODEL = None
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_finbert():
    """Load FinBERT model with retries and device awareness."""
    global TOKENIZER, MODEL
    for attempt in range(FINBERT_CONFIG['load_retries']):
        try:
            logger.debug(f"Attempting to load FinBERT from {FINBERT_CONFIG['model_name']}")
            TOKENIZER = AutoTokenizer.from_pretrained(FINBERT_CONFIG['model_name'])
            MODEL = AutoModelForSequenceClassification.from_pretrained(FINBERT_CONFIG['model_name'])
            MODEL.to(DEVICE)
            
            # Ensure proper label mapping
            if (not hasattr(MODEL.config, 'id2label') or 
                not MODEL.config.id2label or 
                all(label.startswith("LABEL") for label in MODEL.config.id2label.values())):
                MODEL.config.id2label = {0: "negative", 1: "neutral", 2: "positive"}
            
            logger.info(f"FinBERT loaded successfully on {DEVICE}")
            logger.info(f"FinBERT label mapping: {MODEL.config.id2label}")
            return True
        except Exception as e:
            logger.warning(f"Attempt {attempt+1} to load FinBERT failed: {str(e)}")
            if attempt < FINBERT_CONFIG['load_retries'] - 1:
                time.sleep(FINBERT_CONFIG['load_retry_delay'] ** attempt)
    logger.error("Failed to load FinBERT after %d attempts", FINBERT_CONFIG['load_retries'])
    return False

def validate_model():
    """Check and reload the model if necessary."""
    if MODEL is None or TOKENIZER is None:
        logger.warning("FinBERT not initialized, attempting reload")
        return load_finbert()
    return True

def _sanitize_text(text, max_length=100):
    """Sanitize text for safe logging."""
    return text[:max_length].replace('\n', ' ').replace('\r', ' ').strip()

@circuit(
    failure_threshold=FINBERT_CONFIG['circuit_breaker']['failure_threshold'],
    recovery_timeout=FINBERT_CONFIG['circuit_breaker']['recovery_timeout']
)
def analyze_sentiment(text):
    """
    Analyze financial text sentiment using FinBERT.
    Returns a dict with 'label' and 'score'.
    """
    if not validate_model():
        return {'label': 'neutral', 'score': 0.0}
    clean_text = str(text).strip()[:FINBERT_CONFIG['max_text_length']]
    if len(clean_text) < FINBERT_CONFIG['min_text_length']:
        logger.warning(f"Text too short for analysis: {_sanitize_text(clean_text)}")
        return {'label': 'neutral', 'score': 0.0}
    try:
        inputs = TOKENIZER(
            clean_text,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(DEVICE)
        with torch.inference_mode():
            outputs = MODEL(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        score, idx = torch.max(probs, dim=-1)
        
        try:
            label = MODEL.config.id2label[idx.item()].lower()
        except KeyError:
            logger.error(f"Invalid label index: {idx.item()}")
            label = "neutral"
        
        return {
            'label': label,
            'score': normalize_confidence(score.item())
        }
    except Exception as e:
        logger.error(f"Sentiment analysis failed for text '{_sanitize_text(clean_text)}': {str(e)}")
        return {'label': 'neutral', 'score': 0.0}

def analyze_batch(texts):
    """
    Batch process multiple texts for sentiment analysis.
    Returns list of dicts with 'label' and 'score'.
    """
    if not validate_model() or not texts:
        return [{'label': 'neutral', 'score': 0.0}] * len(texts)
    try:
        processed_texts = [str(t).strip()[:FINBERT_CONFIG['max_text_length']] for t in texts]
        valid_texts = [t for t in processed_texts if len(t) >= FINBERT_CONFIG['min_text_length']]
        invalid_indices = [i for i, t in enumerate(processed_texts) if len(t) < FINBERT_CONFIG['min_text_length']]
        results = []
        if valid_texts:
            inputs = TOKENIZER(
                valid_texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            ).to(DEVICE)
            with torch.inference_mode():
                outputs = MODEL(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            scores, indices = torch.max(probs, dim=-1)
            
            batch_results = [{
                'label': MODEL.config.id2label[idx.item()].lower(),
                'score': normalize_confidence(score.item())
            } for score, idx in zip(scores, indices)]
            
            results.extend(batch_results)
        # Handle invalid indices
        for _ in invalid_indices:
            results.append({'label': 'neutral', 'score': 0.0})
        # Restore original order
        final_results = []
        valid_idx = 0
        for i in range(len(texts)):
            if i in invalid_indices:
                final_results.append({'label': 'neutral', 'score': 0.0})
            else:
                final_results.append(results[valid_idx])
                valid_idx += 1
        return final_results
    except Exception as e:
        logger.error(f"Batch sentiment analysis failed: {str(e)}")
        return [{'label': 'neutral', 'score': 0.0}] * len(texts)

def normalize_confidence(confidence):
    """
    Normalize confidence score to float between 0-1.
    Handles percentages and invalid values.
    """
    try:
        confidence = float(confidence)
        if confidence > 1:
            confidence /= 100  # Convert percentage to decimal
        return max(0.0, min(1.0, confidence))  # Clamp between 0-1
    except (TypeError, ValueError):
        logger.warning(f"Non-numeric confidence value received: {confidence}")
        return 0.5  # Fallback to neutral confidence

# Initial model loading
load_finbert()