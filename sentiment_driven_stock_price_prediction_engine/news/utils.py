"""
Sentiment analysis using FinBERT (DistilBERT fine-tuned on SST-2).

This module provides:
- Single-text sentiment analysis (`analyze_sentiment`)
- Batch sentiment analysis (`analyze_batch`) with automatic chunking
- Caching of results for identical inputs (TTL = 1 hour)
- Circuit breaker to prevent repeated failures from overwhelming the model
- Memory-efficient device selection (CPU/CUDA)

Performance:
- Model and tokenizer are loaded once (singleton) using `lru_cache`.
- Sentiment results are cached using Django's cache backend (Redis/LocMem).
- Batch processing uses a local batch size and adapts on OOM without mutating global state.

Author: Tickflow Capital
Version: 1.1.0
"""

import logging
import time
from typing import Union, List, Dict, Any, Optional

from django.conf import settings
from django.core.cache import cache
from functools import lru_cache

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration (read-only)
# ============================================================================

DEFAULT_CONFIG = {
    'model_name': 'distilbert-base-uncased-finetuned-sst-2-english',
    'min_text_length': 20,
    'max_text_length': 2000,
    'confidence_threshold': 0.4,
    'load_retries': 3,
    'load_retry_delay': 2,
    'batch_size': 8,
    'max_memory_mb': 1024,  # 1GB memory limit – only used if CUDA available
    'cache_ttl_seconds': 3600,  # 1 hour for sentiment result caching
    'circuit_breaker_failures': 3,  # consecutive failures before opening circuit
    'circuit_breaker_timeout': 60,  # seconds to wait before retrying
}

# Merge with Django settings (if defined)
_config = {**DEFAULT_CONFIG, **getattr(settings, 'FINBERT_CONFIG', {})}

# Read-only config access – do not mutate after startup
config = _config  # use as read-only


# ============================================================================
# Device selection
# ============================================================================

def get_device():
    """
    Returns the best available device (CUDA if enough memory, else CPU).

    Memory check ensures we don't exceed `config['max_memory_mb']` on GPU.
    """
    import torch  # lazy import

    if torch.cuda.is_available():
        try:
            free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
            if free_mem > config['max_memory_mb'] * 1024 * 1024:
                return torch.device("cuda")
        except Exception:
            pass
    return torch.device("cpu")


# ============================================================================
# Model and tokenizer loading (cached)
# ============================================================================

@lru_cache(maxsize=1)
def load_model():
    """
    Load the FinBERT model with memory‑efficient options.

    Uses `lru_cache` to ensure only one instance is ever loaded.
    """
    import torch
    from transformers import AutoModelForSequenceClassification

    for attempt in range(config['load_retries']):
        try:
            device = get_device()
            logger.info(f"Loading FinBERT (attempt {attempt+1}) on {device}")
            model = AutoModelForSequenceClassification.from_pretrained(
                config['model_name'],
                torch_dtype=torch.float16 if device.type == 'cuda' else torch.float32,
                low_cpu_mem_usage=True
            )
            model.to(device)
            model.eval()

            # Ensure label mapping is correct (SST-2 has 2 labels, but our model may have 3)
            # We keep the original mapping; if labels are generic, we map to our convention.
            if not hasattr(model.config, 'id2label') or all(l.startswith("LABEL") for l in model.config.id2label.values()):
                model.config.id2label = {0: "negative", 1: "neutral", 2: "positive"}
            logger.info(f"Model loaded with labels: {model.config.id2label}")
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
    """Load the tokenizer with caching."""
    from transformers import AutoTokenizer

    try:
        return AutoTokenizer.from_pretrained(config['model_name'])
    except Exception as e:
        logger.error(f"Tokenizer loading failed: {str(e)}")
        return None


def ensure_model_ready() -> bool:
    """
    Ensure model and tokenizer are loaded; if not, clear caches and retry once.

    Returns True if both are loaded, False otherwise.
    """
    tokenizer = load_tokenizer()
    model = load_model()
    if tokenizer is None or model is None:
        # Clear caches to force re‑load on next call
        load_model.cache_clear()
        load_tokenizer.cache_clear()
        # Attempt reload
        tokenizer = load_tokenizer()
        model = load_model()
    return tokenizer is not None and model is not None


# ============================================================================
# Circuit Breaker
# ============================================================================

class _CircuitBreaker:
    """
    Simple circuit breaker to prevent repeated inference failures.

    State:
        - CLOSED: normal operation
        - OPEN: failures exceeded threshold; temporarily block requests
        - HALF_OPEN: after timeout, allow one test request
    """
    def __init__(self, name: str, failure_threshold: int, timeout_seconds: int):
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self._failures = 0
        self._state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._last_failure_time = 0.0

    def _is_timeout_expired(self) -> bool:
        return time.time() - self._last_failure_time > self.timeout_seconds

    def allow_request(self) -> bool:
        """Return True if request should be allowed."""
        if self._state == "CLOSED":
            return True
        if self._state == "OPEN":
            if self._is_timeout_expired():
                self._state = "HALF_OPEN"
                return True
            return False
        # HALF_OPEN
        return True

    def record_success(self):
        """Reset circuit on success (in HALF_OPEN) or when failures < threshold."""
        if self._state == "HALF_OPEN":
            self._state = "CLOSED"
            self._failures = 0
        elif self._state == "CLOSED":
            self._failures = 0
        # In OPEN, we don't record success until HALF_OPEN

    def record_failure(self):
        """Increment failure count; open circuit if threshold exceeded."""
        if self._state in ("CLOSED", "HALF_OPEN"):
            self._failures += 1
            self._last_failure_time = time.time()
            if self._failures >= self.failure_threshold:
                self._state = "OPEN"
                logger.warning(f"Circuit breaker {self.name} opened after {self._failures} failures")
        # In OPEN, failures are not counted further

    def get_state(self) -> str:
        return self._state


# Singleton circuit breaker for sentiment inference
_sentiment_circuit = _CircuitBreaker(
    name="sentiment",
    failure_threshold=config['circuit_breaker_failures'],
    timeout_seconds=config['circuit_breaker_timeout']
)


# ============================================================================
# Core sentiment analysis functions
# ============================================================================

def _get_cached_result(text: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached sentiment result for a given text."""
    key = f"sentiment_cache:{hash(text)}"
    return cache.get(key)


def _set_cached_result(text: str, result: Dict[str, Any]) -> None:
    """Cache sentiment result with TTL."""
    key = f"sentiment_cache:{hash(text)}"
    cache.set(key, result, timeout=config['cache_ttl_seconds'])


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Single‑text sentiment analysis.

    Returns:
        dict: {'label': 'positive'|'neutral'|'negative', 'score': float (0-1)}
    """
    # 1. Check circuit breaker
    if not _sentiment_circuit.allow_request():
        logger.warning("Circuit open – returning neutral")
        return {'label': 'neutral', 'score': 0.0}

    # 2. Check cache
    text = str(text).strip()
    cached = _get_cached_result(text)
    if cached is not None:
        return cached

    # 3. Validate model
    if not ensure_model_ready():
        _sentiment_circuit.record_failure()
        return {'label': 'neutral', 'score': 0.0}

    # 4. Input validation
    if len(text) < config['min_text_length']:
        result = {'label': 'neutral', 'score': 0.0}
        _set_cached_result(text, result)
        return result

    try:
        import torch  # lazy import
        tokenizer = load_tokenizer()
        model = load_model()
        if tokenizer is None or model is None:
            raise RuntimeError("Model or tokenizer not available")

        inputs = tokenizer(
            text[:config['max_text_length']],
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(get_device())

        with torch.inference_mode():
            outputs = model(**inputs)

        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        score, idx = torch.max(probs, dim=-1)

        label = model.config.id2label.get(idx.item(), "neutral").lower()
        result = {'label': label, 'score': float(score.item())}

        # Cache result
        _set_cached_result(text, result)
        _sentiment_circuit.record_success()
        return result

    except torch.cuda.OutOfMemoryError:
        logger.error("CUDA OOM – clearing cache")
        torch.cuda.empty_cache()
        _sentiment_circuit.record_failure()
        return {'label': 'neutral', 'score': 0.0}
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        _sentiment_circuit.record_failure()
        return {'label': 'neutral', 'score': 0.0}


def analyze_batch(texts: List[str]) -> List[Dict[str, Any]]:
    """
    Batch sentiment analysis with automatic chunking.

    Args:
        texts: List of text strings.

    Returns:
        List of dicts, each with 'label' and 'score'.
        If an error occurs, neutral results are returned for the affected batch.
    """
    if not texts:
        return []

    # 1. Check circuit breaker
    if not _sentiment_circuit.allow_request():
        logger.warning("Circuit open – returning neutral for batch")
        return [{'label': 'neutral', 'score': 0.0} for _ in texts]

    # 2. Validate model
    if not ensure_model_ready():
        _sentiment_circuit.record_failure()
        return [{'label': 'neutral', 'score': 0.0} for _ in texts]

    # 3. Use a local batch size (do not mutate global config)
    batch_size = config['batch_size']
    results: List[Dict[str, Any]] = []
    tokenizer = load_tokenizer()
    model = load_model()
    device = get_device()

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        # Check each text length; if too short, return neutral directly
        batch_results = []
        short_text_indices = []
        long_texts = []
        for idx, t in enumerate(batch):
            if len(str(t).strip()) < config['min_text_length']:
                batch_results.append({'label': 'neutral', 'score': 0.0})
            else:
                short_text_indices.append(idx)
                long_texts.append(t)

        # If there are long texts, process them
        if long_texts:
            try:
                inputs = tokenizer(
                    [str(t).strip()[:config['max_text_length']] for t in long_texts],
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt"
                ).to(device)

                import torch  # lazy import
                with torch.inference_mode():
                    outputs = model(**inputs)

                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                scores, indices = torch.max(probs, dim=-1)

                # Build results for long texts
                long_results = [{
                    'label': model.config.id2label.get(idx.item(), "neutral").lower(),
                    'score': float(score.item())
                } for score, idx in zip(scores, indices)]

                # Insert back into batch_results
                for pos, res in zip(short_text_indices, long_results):
                    batch_results[pos] = res
                _sentiment_circuit.record_success()

            except torch.cuda.OutOfMemoryError:
                logger.warning("Batch too large – reducing batch size dynamically")
                # Reduce batch size for this iteration only
                # Recurse on this batch with smaller size
                smaller_batch = batch
                # We can't easily recurse here without risking infinite loop, so we'll process one by one
                for t in batch:
                    results.append(analyze_sentiment(t))
                continue  # skip the rest of this batch processing
            except Exception as e:
                logger.error(f"Batch processing failed: {str(e)}")
                _sentiment_circuit.record_failure()
                # For the whole batch, return neutral
                batch_results = [{'label': 'neutral', 'score': 0.0} for _ in batch]

        results.extend(batch_results)

    return results


# ============================================================================
# Utility function for model readiness (for health checks)
# ============================================================================

def is_model_ready() -> bool:
    """Check if model and tokenizer are loaded and functional."""
    return load_tokenizer() is not None and load_model() is not None