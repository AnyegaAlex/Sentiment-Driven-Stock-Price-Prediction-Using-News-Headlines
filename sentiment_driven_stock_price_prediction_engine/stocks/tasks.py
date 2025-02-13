# sentiment_driven_stock_price_prediction_engine/stocks/tasks.py
from celery import shared_task
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

@shared_task
def analyze_sentiment(text):
    """
    Analyze financial text using FinBERT model
    Returns: (sentiment_label, confidence_score)
    """
    try:
        tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
        
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        outputs = model(**inputs)
        
        probs = np.exp(outputs.logits.detach().numpy())[0]
        labels = ['positive', 'negative', 'neutral']
        max_index = np.argmax(probs)
        
        return labels[max_index], float(probs[max_index])
        
    except Exception as e:
        print(f"Sentiment analysis error: {str(e)}")
        return 'neutral', 0.0