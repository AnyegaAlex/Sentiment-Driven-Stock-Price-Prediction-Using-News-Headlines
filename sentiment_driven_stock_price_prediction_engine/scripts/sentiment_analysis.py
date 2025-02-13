from transformers import BertTokenizer, BertForSequenceClassification
import torch
import pandas as pd
from tqdm import tqdm  # Progress bar for better tracking

# Load dataset
file_path = r"C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv"
df = pd.read_csv(file_path)

# Load FinBERT model
model_name = "ProsusAI/finbert"
tokenizer = BertTokenizer.from_pretrained(model_name)
model = BertForSequenceClassification.from_pretrained(model_name)

# Use GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

# Batch processing function
def get_sentiment_scores(news_list, batch_size=16):
    sentiment_scores = []
    
    for i in tqdm(range(0, len(news_list), batch_size), desc="Processing News"):
        batch = news_list[i : i + batch_size]
        inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
        # Move tensors to GPU if available
        inputs = {key: value.to(device) for key, value in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        scores = torch.nn.functional.softmax(outputs.logits, dim=-1).cpu().tolist()
        sentiment_scores.extend(scores)

    return sentiment_scores

# Apply sentiment analysis in batches
news_texts = df["News"].astype(str).tolist()
df["Sentiment_Score"] = get_sentiment_scores(news_texts)

# Save the dataset with sentiment scores
sentiment_file_path = r"C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\stocks\ibm_sentiment.csv"
df.to_csv(sentiment_file_path, index=False)

print(f"Sentiment data saved to: {sentiment_file_path}")
