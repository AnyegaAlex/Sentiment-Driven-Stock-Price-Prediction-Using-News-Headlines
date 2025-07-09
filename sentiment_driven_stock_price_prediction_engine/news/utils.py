from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import torch
import logging
import time
from django.conf import settings
from copy import deepcopy
from functools import lru_cache
from typing import Union

# Initialize logger
logger = logging.getLogger(__name__)

# Configuration with defaults
DEFAULT_CONFIG = {
    'model_name': 'ProsusAI/finbert',
    'min_text_length': 20,
    'max_text_length': 2000,
    'confidence_threshold': 0.4,
    'load_retries': 3,
    'load_retry_delay': 2,
    'batch_size': 8,
    'max_memory_mb': 1024  # 1GB memory limit
}

# Merge with Django settings
config = {**DEFAULT_CONFIG, **getattr(settings, 'FINBERT_CONFIG', {})}

# Device setup with memory awareness
def get_device():
    if torch.cuda.is_available():
        free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
        if free_mem > config['max_memory_mb'] * 1024 * 1024:
            return torch.device("cuda")
    return torch.device("cpu")

device = get_device()

def _sanitize_text(text: str, max_length: int = 100) -> str:
    """
    Sanitize text for safe logging by:
    - Truncating to max_length
    - Removing newlines
    - Stripping whitespace
    
    Args:
        text: Input text to sanitize
        max_length: Maximum length of output string
        
    Returns:
        Sanitized text safe for logging
    """
    if not isinstance(text, str):
        text = str(text)
    return text[:max_length].replace('\n', ' ').replace('\r', ' ').strip()

def normalize_confidence(confidence: Union[float, int]) -> float:
    """
    Normalize confidence score to ensure it's between 0.0 and 1.0.
    Handles percentages (e.g., 80 -> 0.8) and invalid values.
    
    Args:
        confidence: Input confidence score (may be percentage or decimal)
        
    Returns:
        Normalized confidence score between 0.0 and 1.0
    """
    try:
        confidence = float(confidence)
        if confidence > 1:  # Assume percentage if > 1
            confidence /= 100
        return max(0.0, min(1.0, confidence))  # Clamp to [0,1] range
    except (TypeError, ValueError) as e:
        logger.warning(f"Invalid confidence value {confidence}: {str(e)}")
        return 0.5  # Neutral fallback
    
@lru_cache(maxsize=1)
def load_model():
    """Load model with memory-efficient settings"""
    for attempt in range(config['load_retries']):
        try:
            logger.info(f"Loading FinBERT (attempt {attempt+1})")
            
            # Use low-memory options
            model = AutoModelForSequenceClassification.from_pretrained(
                config['model_name'],
                torch_dtype=torch.float16 if device.type == 'cuda' else torch.float32,
                low_cpu_mem_usage=True
            )
            model.to(device)
            model.eval()
            
            # Verify label mapping
            if not hasattr(model.config, 'id2label') or all(l.startswith("LABEL") for l in model.config.id2label.values()):
                model.config.id2label = {0: "negative", 1: "neutral", 2: "positive"}
            
            logger.info(f"Model loaded on {device} with labels: {model.config.id2label}")
            return model
        except Exception as e:
            logger.warning(f"Attempt {attempt+1} failed: {str(e)}")
            if attempt < config['load_retries'] - 1:
                time.sleep(config['load_retry_delay'] ** attempt)
            # Clear memory
            if 'model' in locals():
                del model
            torch.cuda.empty_cache()
    
    logger.error("Model loading failed after retries")
    return None

@lru_cache(maxsize=1)
def load_tokenizer():
    """Load tokenizer with caching"""
    try:
        return AutoTokenizer.from_pretrained(config['model_name'])
    except Exception as e:
        logger.error(f"Tokenizer loading failed: {str(e)}")
        return None

def validate_model():
    """Check if model is ready with automatic reload"""
    global device
    device = get_device()  # Check for device changes
    
    if load_tokenizer() is None or load_model() is None:
        # Clear caches and retry
        load_model.cache_clear()
        load_tokenizer.cache_clear()
        return load_tokenizer() is not None and load_model() is not None
    return True
def warmup_model():
    """Pre-load model and run warmup inference"""
    if not validate_model():
        return False
    
    try:
        # Warmup with small batch
        sample_text = "Market shows positive trends with strong earnings"
        inputs = load_tokenizer()(
            sample_text,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(device)
        
        with torch.inference_mode():
            load_model()(**inputs)
        
        logger.info("Model warmup completed")
        return True
    except Exception as e:
        logger.error(f"Warmup failed: {str(e)}")
        return False
    
def analyze_sentiment(text):
    """
    Optimized single-text sentiment analysis with memory limits
    """
    if not validate_model():
        return {'label': 'neutral', 'score': 0.0}
    
    text = str(text).strip()
    if len(text) < config['min_text_length']:
        return {'label': 'neutral', 'score': 0.0}
    
    try:
        inputs = load_tokenizer()(
            text[:config['max_text_length']],
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(device)
        
        with torch.inference_mode():
            outputs = load_model()(**inputs)
        
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        score, idx = torch.max(probs, dim=-1)
        
        return {
            'label': load_model().config.id2label[idx.item()].lower(),
            'score': float(score.item())
        }
    except torch.cuda.OutOfMemoryError:
        logger.error("CUDA out of memory - clearing cache")
        torch.cuda.empty_cache()
        return {'label': 'neutral', 'score': 0.0}
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        return {'label': 'neutral', 'score': 0.0}

def analyze_batch(texts):
    """
    Memory-efficient batch processing with chunking
    """
    if not validate_model() or not texts:
        return [{'label': 'neutral', 'score': 0.0} for _ in texts]
    
    results = []
    for i in range(0, len(texts), config['batch_size']):
        batch = texts[i:i + config['batch_size']]
        try:
            inputs = load_tokenizer()(
                [str(t).strip()[:config['max_text_length']] for t in batch],
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            ).to(device)
            
            with torch.inference_mode():
                outputs = load_model()(**inputs)
            
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            scores, indices = torch.max(probs, dim=-1)
            
            results.extend([{
                'label': load_model().config.id2label[idx.item()].lower(),
                'score': float(score.item())
            } for score, idx in zip(scores, indices)])
            
            # Clear memory between batches
            del inputs, outputs, probs, scores, indices
            torch.cuda.empty_cache()
            
        except torch.cuda.OutOfMemoryError:
            logger.warning("Batch too large - reducing size")
            config['batch_size'] = max(1, config['batch_size'] // 2)
            return analyze_batch(texts)  # Retry with smaller batch
            
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")
            results.extend([{'label': 'neutral', 'score': 0.0} for _ in batch])
    
    return results

# Initial model loading
warmup_model()
