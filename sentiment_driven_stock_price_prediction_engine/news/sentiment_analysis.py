import pandas as pd
import torch
from transformers import BertTokenizer, BertForSequenceClassification

# Load FinBERT model and tokenizer
MODEL_NAME = "yiyanghkust/finbert-tone"
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
model = BertForSequenceClassification.from_pretrained(MODEL_NAME)

def predict_sentiment(text):
    """Predict sentiment of a news headline using FinBERT."""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    return ["negative", "neutral", "positive"][prediction]

def process_news_data(news_file_path):
    """Load news dataset and classify sentiment."""
    df = pd.read_csv(news_file_path)
    df["sentiment"] = df["headline"].apply(predict_sentiment)
    return df

if __name__ == "__main__":
    sentiment_data = process_news_data("../data/news/sentiment_analysis_for_financial_news.csv")
    sentiment_data.to_csv("../data/news/sentiment_predictions.csv", index=False)
