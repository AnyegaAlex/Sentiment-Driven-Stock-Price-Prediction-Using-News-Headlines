"""
Tests for news/utils.py – sentiment analysis with FinBERT.

Covers:
- Device selection (get_device)
- Model and tokenizer loading (load_model, load_tokenizer, ensure_model_ready)
- Circuit breaker (_CircuitBreaker)
- Cache helpers (_get_cached_result, _set_cached_result)
- Single-text sentiment (analyze_sentiment)
- Batch sentiment (analyze_batch)
- Model readiness check (is_model_ready)

All external dependencies (torch, transformers, cache) are mocked.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from django.core.cache import cache

from news.utils import (
    get_device,
    load_model,
    load_tokenizer,
    ensure_model_ready,
    _CircuitBreaker,
    _get_cached_result,
    _set_cached_result,
    analyze_sentiment,
    analyze_batch,
    is_model_ready,
    config,
    _sentiment_circuit,
)

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def clear_caches():
    """Clear lru_cache and Django cache before each test."""
    load_model.cache_clear()
    load_tokenizer.cache_clear()
    cache.clear()
    # Reset circuit breaker state
    _sentiment_circuit._state = "CLOSED"
    _sentiment_circuit._failures = 0
    _sentiment_circuit._last_failure_time = 0.0
    yield


@pytest.fixture
def mock_model():
    """Mock a HuggingFace model with config and id2label."""
    mock = MagicMock()
    mock.config.id2label = {0: "negative", 1: "neutral", 2: "positive"}
    mock.to.return_value = mock
    mock.eval.return_value = mock
    return mock


@pytest.fixture
def mock_tokenizer():
    """Mock a HuggingFace tokenizer."""
    mock = MagicMock()
    mock.return_value = {"input_ids": [[1, 2, 3]]}
    return mock


# ============================================================================
# Test: get_device
# ============================================================================

class TestGetDevice:
    def test_get_device_cpu_when_cuda_unavailable(self):
        """CPU is returned when CUDA is not available."""
        with patch('torch.cuda.is_available', return_value=False):
            device = get_device()
            assert device.type == "cpu"

    def test_get_device_cpu_when_cuda_memory_insufficient(self):
        """CPU is returned when CUDA memory is insufficient."""
        with patch('torch.cuda.is_available', return_value=True):
            with patch('torch.cuda.get_device_properties') as mock_props:
                mock_props.return_value.total_memory = 256 * 1024 * 1024  # 256MB
                with patch('torch.cuda.memory_allocated', return_value=0):
                    device = get_device()
                    assert device.type == "cpu"

    def test_get_device_cuda_when_available_and_memory_sufficient(self):
        """CUDA is returned when available and memory sufficient."""
        with patch('torch.cuda.is_available', return_value=True):
            with patch('torch.cuda.get_device_properties') as mock_props:
                mock_props.return_value.total_memory = 2 * 1024 * 1024 * 1024  # 2GB
                with patch('torch.cuda.memory_allocated', return_value=0):
                    device = get_device()
                    assert device.type == "cuda"

    def test_get_device_fallback_cpu_on_exception(self):
        """If any exception occurs, CPU is returned."""
        with patch('torch.cuda.is_available', return_value=True):
            with patch('torch.cuda.get_device_properties', side_effect=Exception):
                device = get_device()
                assert device.type == "cpu"


# ============================================================================
# Test: load_model and load_tokenizer
# ============================================================================

class TestLoadModel:
    def test_load_model_success(self, mock_model):
        """Model loads successfully and is cached."""
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained', return_value=mock_model):
            model = load_model()
            assert model is mock_model
            # Second call should return cached instance (same object)
            model2 = load_model()
            assert model2 is mock_model

    def test_load_model_retries_on_failure(self, mock_model):
        """Retries up to load_retries times."""
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained') as mock_pretrained:
            # Fail twice, succeed third time
            mock_pretrained.side_effect = [Exception("Fail 1"), Exception("Fail 2"), mock_model]
            with patch('time.sleep') as mock_sleep:
                model = load_model()
                assert model is mock_model
                assert mock_pretrained.call_count == 3
                assert mock_sleep.call_count == 2

    def test_load_model_failure_all_retries(self):
        """If all retries fail, return None."""
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained', side_effect=Exception("Always fail")):
            with patch('time.sleep'):
                model = load_model()
                assert model is None

    def test_load_model_sets_id2label_if_missing(self, mock_model):
        """If model lacks id2label, sets a default mapping."""
        # Remove id2label
        del mock_model.config.id2label
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained', return_value=mock_model):
            model = load_model()
            assert model is mock_model
            assert model.config.id2label == {0: "negative", 1: "neutral", 2: "positive"}


class TestLoadTokenizer:
    def test_load_tokenizer_success(self, mock_tokenizer):
        with patch('transformers.AutoTokenizer.from_pretrained', return_value=mock_tokenizer):
            tokenizer = load_tokenizer()
            assert tokenizer is mock_tokenizer
            # Cached
            tokenizer2 = load_tokenizer()
            assert tokenizer2 is mock_tokenizer

    def test_load_tokenizer_failure(self):
        with patch('transformers.AutoTokenizer.from_pretrained', side_effect=Exception):
            tokenizer = load_tokenizer()
            assert tokenizer is None


class TestEnsureModelReady:
    def test_ensure_model_ready_success(self, mock_model, mock_tokenizer):
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained', return_value=mock_model):
            with patch('transformers.AutoTokenizer.from_pretrained', return_value=mock_tokenizer):
                assert ensure_model_ready() is True

    def test_ensure_model_ready_retries_on_failure(self, mock_model, mock_tokenizer):
        # First call fails, second succeeds
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained') as mock_model_load:
            mock_model_load.side_effect = [Exception, mock_model]
            with patch('transformers.AutoTokenizer.from_pretrained', return_value=mock_tokenizer):
                assert ensure_model_ready() is True
                # load_model called twice, load_tokenizer called twice
                assert mock_model_load.call_count == 2

    def test_ensure_model_ready_fails(self):
        with patch('transformers.AutoModelForSequenceClassification.from_pretrained', side_effect=Exception):
            with patch('transformers.AutoTokenizer.from_pretrained', side_effect=Exception):
                assert ensure_model_ready() is False


# ============================================================================
# Test: _CircuitBreaker
# ============================================================================

class TestCircuitBreaker:
    def test_initial_state_closed(self):
        cb = _CircuitBreaker("test", 3, 60)
        assert cb.get_state() == "CLOSED"
        assert cb.allow_request() is True

    def test_circuit_opens_after_failures(self):
        cb = _CircuitBreaker("test", 3, 60)
        cb.record_failure()  # 1
        cb.record_failure()  # 2
        cb.record_failure()  # 3
        assert cb.get_state() == "OPEN"
        assert cb.allow_request() is False

    def test_circuit_opens_after_failures_reset_on_success(self):
        cb = _CircuitBreaker("test", 3, 60)
        cb.record_failure()  # 1
        cb.record_failure()  # 2
        cb.record_success()  # resets failures to 0
        assert cb.get_state() == "CLOSED"
        cb.record_failure()  # 1
        cb.record_failure()  # 2
        cb.record_failure()  # 3
        # Should open after 3 failures from reset
        assert cb.get_state() == "OPEN"

    def test_circuit_half_open_after_timeout(self):
        cb = _CircuitBreaker("test", 3, timeout_seconds=1)
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        assert cb.get_state() == "OPEN"
        assert cb.allow_request() is False
        # Simulate timeout
        with patch('time.time', return_value=time.time() + 2):
            assert cb.allow_request() is True  # Half-open
            assert cb.get_state() == "HALF_OPEN"
            # Successful request closes circuit
            cb.record_success()
            assert cb.get_state() == "CLOSED"
            assert cb._failures == 0

    def test_circuit_stays_open_if_failure_in_half_open(self):
        cb = _CircuitBreaker("test", 3, timeout_seconds=1)
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        with patch('time.time', return_value=time.time() + 2):
            assert cb.allow_request() is True  # Half-open
            cb.record_failure()  # failure in half-open
            assert cb.get_state() == "OPEN"
            assert cb._failures == 4  # increment continues


# ============================================================================
# Test: Cache helpers
# ============================================================================

class TestCacheHelpers:
    def test_set_and_get_cache(self):
        text = "test text"
        result = {'label': 'positive', 'score': 0.9}
        _set_cached_result(text, result)
        cached = _get_cached_result(text)
        assert cached == result

    def test_cache_ttl_respected(self):
        # We can't easily test TTL with mock, but we can check that cache.set is called with timeout.
        with patch('django.core.cache.cache.set') as mock_set:
            _set_cached_result("text", {'label': 'neutral', 'score': 0.0})
            mock_set.assert_called_once()
            args, kwargs = mock_set.call_args
            assert kwargs.get('timeout') == config['cache_ttl_seconds']


# ============================================================================
# Test: analyze_sentiment
# ============================================================================

class TestAnalyzeSentiment:
    def test_analyze_sentiment_circuit_open_returns_neutral(self):
        _sentiment_circuit._state = "OPEN"
        result = analyze_sentiment("some text")
        assert result == {'label': 'neutral', 'score': 0.0}

    def test_analyze_sentiment_cache_hit(self):
        cached_result = {'label': 'positive', 'score': 0.9}
        with patch('news.utils._get_cached_result', return_value=cached_result) as mock_cache:
            result = analyze_sentiment("text")
            assert result == cached_result
            mock_cache.assert_called_with("text")

    def test_analyze_sentiment_cache_miss_model_ready(self, mock_model, mock_tokenizer):
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer', return_value=mock_tokenizer):
                    with patch('news.utils.load_model', return_value=mock_model):
                        # Mock tokenizer and model outputs
                        mock_tokenizer.return_value = {"input_ids": [[1]]}
                        mock_model.return_value = MagicMock()
                        mock_model.return_value.logits = MagicMock()
                        # Simulate softmax output: positive with 0.9
                        with patch('torch.nn.functional.softmax') as mock_softmax:
                            mock_softmax.return_value = torch.tensor([[0.1, 0.9]])
                            # Mock torch.max
                            with patch('torch.max') as mock_max:
                                mock_max.return_value = (torch.tensor(0.9), torch.tensor(1))
                                result = analyze_sentiment("Great product!")
                                assert result['label'] == 'positive'  # id2label[1] = positive? Actually our mapping: 0=negative,1=neutral,2=positive. We set idx=1 -> 'neutral'? Wait: Our mock_model.config.id2label = {0: "negative", 1: "neutral", 2: "positive"}. If we set idx=1, label would be 'neutral'. Let's adjust idx=2 for positive.
                                # We'll control idx by mocking torch.max to return 2.
                                mock_max.return_value = (torch.tensor(0.9), torch.tensor(2))
                                result = analyze_sentiment("Great product!")
                                assert result['label'] == 'positive'

    def test_analyze_sentiment_model_not_ready_returns_neutral_and_records_failure(self):
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=False):
                with patch.object(_sentiment_circuit, 'record_failure') as mock_fail:
                    result = analyze_sentiment("some text")
                    assert result == {'label': 'neutral', 'score': 0.0}
                    mock_fail.assert_called_once()

    def test_analyze_sentiment_short_text(self):
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                # Short text should return neutral without model call
                with patch('news.utils._set_cached_result') as mock_set:
                    result = analyze_sentiment("short")
                    assert result == {'label': 'neutral', 'score': 0.0}
                    mock_set.assert_called_with("short", {'label': 'neutral', 'score': 0.0})

    def test_analyze_sentiment_cuda_oom_records_failure(self):
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer') as mock_tokenizer:
                    mock_tokenizer.return_value = MagicMock()
                    mock_tokenizer.return_value.return_value = {"input_ids": [[1]]}
                    with patch('news.utils.load_model') as mock_model:
                        mock_model.return_value = MagicMock()
                        # Simulate OOM
                        mock_model.return_value.side_effect = torch.cuda.OutOfMemoryError
                        with patch.object(_sentiment_circuit, 'record_failure') as mock_fail:
                            with patch('torch.cuda.empty_cache') as mock_empty:
                                result = analyze_sentiment("long text")
                                assert result == {'label': 'neutral', 'score': 0.0}
                                mock_fail.assert_called_once()
                                mock_empty.assert_called_once()

    def test_analyze_sentiment_exception_records_failure(self):
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer', side_effect=Exception("Fail")):
                    with patch.object(_sentiment_circuit, 'record_failure') as mock_fail:
                        result = analyze_sentiment("long text")
                        assert result == {'label': 'neutral', 'score': 0.0}
                        mock_fail.assert_called_once()


# ============================================================================
# Test: analyze_batch
# ============================================================================

class TestAnalyzeBatch:
    def test_analyze_batch_empty_list(self):
        result = analyze_batch([])
        assert result == []

    def test_analyze_batch_circuit_open_returns_neutral(self):
        _sentiment_circuit._state = "OPEN"
        result = analyze_batch(["text1", "text2"])
        assert result == [{'label': 'neutral', 'score': 0.0}, {'label': 'neutral', 'score': 0.0}]

    def test_analyze_batch_model_not_ready_returns_neutral(self):
        with patch('news.utils.ensure_model_ready', return_value=False):
            with patch.object(_sentiment_circuit, 'record_failure') as mock_fail:
                result = analyze_batch(["text1"])
                assert result == [{'label': 'neutral', 'score': 0.0}]
                mock_fail.assert_called_once()

    def test_analyze_batch_mixed_length(self):
        """Short texts skipped, long texts processed."""
        texts = ["short", "This is a longer text that should be analyzed"]
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer') as mock_tokenizer:
                    mock_tokenizer.return_value = MagicMock()
                    mock_tokenizer.return_value.return_value = {"input_ids": [[1,2,3]]}
                    with patch('news.utils.load_model') as mock_model:
                        mock_model.return_value = MagicMock()
                        mock_model.return_value.return_value.logits = MagicMock()
                        with patch('torch.nn.functional.softmax') as mock_softmax:
                            mock_softmax.return_value = torch.tensor([[0.1, 0.9]])
                            with patch('torch.max') as mock_max:
                                mock_max.return_value = (torch.tensor(0.9), torch.tensor(2))
                                result = analyze_batch(texts)
                                # Should have 2 results: first neutral, second positive
                                assert len(result) == 2
                                assert result[0] == {'label': 'neutral', 'score': 0.0}
                                assert result[1]['label'] == 'positive'

    def test_analyze_batch_oom_falls_back_to_single(self):
        texts = ["long text 1", "long text 2"]
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer') as mock_tokenizer:
                    mock_tokenizer.return_value = MagicMock()
                    mock_tokenizer.return_value.return_value = {"input_ids": [[1,2,3]]}
                    with patch('news.utils.load_model') as mock_model:
                        # Simulate OOM on batch, then single works
                        mock_model.return_value = MagicMock()
                        # First call to model in batch raises OOM
                        mock_model.return_value.side_effect = [torch.cuda.OutOfMemoryError, MagicMock()]
                        # Then single analysis will call load_model again, we need to handle that.
                        # We'll patch analyze_sentiment to return positive for single
                        with patch('news.utils.analyze_sentiment') as mock_single:
                            mock_single.return_value = {'label': 'positive', 'score': 0.9}
                            result = analyze_batch(texts)
                            assert len(result) == 2
                            assert result[0]['label'] == 'positive'
                            assert result[1]['label'] == 'positive'
                            # verify analyze_sentiment was called twice (once per text)
                            assert mock_single.call_count == 2

    def test_analyze_batch_exception_returns_neutral_for_batch(self):
        texts = ["long text 1"]
        with patch('news.utils._get_cached_result', return_value=None):
            with patch('news.utils.ensure_model_ready', return_value=True):
                with patch('news.utils.load_tokenizer', side_effect=Exception("Fail")):
                    with patch.object(_sentiment_circuit, 'record_failure') as mock_fail:
                        result = analyze_batch(texts)
                        assert result == [{'label': 'neutral', 'score': 0.0}]
                        mock_fail.assert_called_once()


# ============================================================================
# Test: is_model_ready
# ============================================================================

class TestIsModelReady:
    def test_is_model_ready_true(self, mock_model, mock_tokenizer):
        with patch('news.utils.load_tokenizer', return_value=mock_tokenizer):
            with patch('news.utils.load_model', return_value=mock_model):
                assert is_model_ready() is True

    def test_is_model_ready_false(self):
        with patch('news.utils.load_tokenizer', return_value=None):
            with patch('news.utils.load_model', return_value=None):
                assert is_model_ready() is False