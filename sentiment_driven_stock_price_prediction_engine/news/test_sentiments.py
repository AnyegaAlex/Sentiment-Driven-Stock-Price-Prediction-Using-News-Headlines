import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')
django.setup()
from news.finbert_sentiment import analyze_sentiment, analyze_sentiment_batch

# Test single text analysis
def test_single_text():
    text = "Apple stock rises after positive earnings report"
    result = analyze_sentiment(text)
    print("Single Text Analysis:")
    print(result)

# Test batch processing
def test_batch_processing():
    texts = [
        "Apple stock rises after positive earnings report",
        "Market crashes due to global economic concerns",
        "Tesla announces new battery technology"
    ]
    results = analyze_sentiment_batch(texts)
    print("\nBatch Analysis:")
    for i, result in enumerate(results):
        print(f"Text {i + 1}: {result}")

# Test rate limiting
def test_rate_limiting():
    print("\nRate Limiting Test:")
    for i in range(105):  # Exceed the rate limit
        result = analyze_sentiment(f"Test text {i + 1}")
        if 'error' in result and result['error'] == 'Rate limit exceeded':
            print(f"Rate limit hit at request {i + 1}")
            break

if __name__ == "__main__":
    test_single_text()
    test_batch_processing()
    test_rate_limiting()