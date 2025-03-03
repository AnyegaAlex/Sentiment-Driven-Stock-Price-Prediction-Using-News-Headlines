#!/usr/bin/env python
"""
This script implements the training pipeline for a sentiment-driven stock price prediction model.
It uses:
  • FinBERT (via Hugging Face pipelines) for sentiment analysis.
  • Technical indicator engineering (moving averages, standard deviation, RSI, Bollinger Bands).
  • An LSTM model for time-series classification (predicting next-day price movement).
  
Hardware: 8GB RAM, 256GB SSD, no GPU → optimized for CPU.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from transformers import pipeline
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from tqdm.auto import tqdm  # For progress bar
tqdm.pandas()  # Enable progress_apply for pandas

# ----------------------------
# Filepaths (adjust as needed)
# ----------------------------
STOCK_DATA_PATH = r'C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv'  # Historical stock CSV
MODEL_SAVE_PATH = "./sentiment_driven_stock_price_prediction_engine/models/stock_prediction_model.pth"

# ----------------------------
# 1. Data Preparation Functions
# ----------------------------

def load_stock_data(filepath: str) -> pd.DataFrame:
    """Load and sort historical stock data by date."""
    df = pd.read_csv(filepath, parse_dates=["Date"])
    df.sort_values(by="Date", inplace=True)
    return df

def add_sentiment_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Use FinBERT for sentiment analysis on the 'News' column.
    Process each news headline with truncation (first 512 characters) to stay within token limits.
    Positive sentiments yield a positive score; negatives yield a negative score.
    A progress bar is shown to monitor processing over large datasets.
    """
    # Initialize FinBERT pipeline (using CPU: device=-1)
    sentiment_model = pipeline("text-classification", model="ProsusAI/finbert", device=-1)

    def get_sentiment(text: str) -> float:
        # Return neutral (0.0) if missing text.
        if not isinstance(text, str) or text.strip() == "":
            return 0.0
        truncated_text = text[:512]
        result = sentiment_model(truncated_text)[0]
        score = result.get("score", 0.0)
        # Assign positive score if label is positive; else, negative.
        return score if result["label"].lower() == "positive" else -score

    # Use progress_apply to display a progress bar while processing sentiment scores.
    df["sentiment_score"] = df["News"].fillna("").progress_apply(get_sentiment)
    return df

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Compute moving averages, standard deviation, RSI, and Bollinger Bands."""
    df["MA7"] = df["Close"].rolling(window=7).mean()
    df["MA21"] = df["Close"].rolling(window=21).mean()
    df["STD21"] = df["Close"].rolling(window=21).std()
    
    def compute_rsi(series: pd.Series, window: int = 14) -> pd.Series:
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    df["RSI14"] = compute_rsi(df["Close"])
    df["UpperBB"] = df["MA21"] + (df["STD21"] * 2)
    df["LowerBB"] = df["MA21"] - (df["STD21"] * 2)
    return df

def prepare_training_data(df: pd.DataFrame):
    """
    Create features and target variable.
      - Features: sentiment_score and technical indicators.
      - Target: next-day price movement (1 if price increases, 0 otherwise).
    """
    df["Price_Change"] = (df["Close"].shift(-1) > df["Close"]).astype(int)
    feature_columns = ["sentiment_score", "MA7", "MA21", "STD21", "RSI14", "UpperBB", "LowerBB"]
    df = df.dropna(subset=feature_columns + ["Price_Change"])
    X = df[feature_columns]
    y = df["Price_Change"]
    return X, y

# ----------------------------
# 2. Model Architecture: LSTM for Classification
# ----------------------------

class LSTMModel(nn.Module):
    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        _, (hidden, _) = self.lstm(x)
        return self.fc(hidden[-1])

def train_model(X_train: pd.DataFrame, y_train: pd.Series, input_size: int, epochs: int = 20, batch_size: int = 32):
    model = LSTMModel(input_size=input_size, hidden_size=32, output_size=1)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    loss_fn = nn.BCEWithLogitsLoss()

    X_train_tensor = torch.tensor(X_train.values, dtype=torch.float32).unsqueeze(1)
    y_train_tensor = torch.tensor(y_train.values, dtype=torch.float32)

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X_train_tensor).squeeze()
        loss = loss_fn(outputs, y_train_tensor)
        loss.backward()
        optimizer.step()
        print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
    return model

# ----------------------------
# 3. Main Pipeline Function
# ----------------------------

def main():
    df = load_stock_data(STOCK_DATA_PATH)
    print("Loaded stock data:", df.shape)
    
    df = add_sentiment_scores(df)
    print("Added sentiment scores.")
    
    df = add_technical_indicators(df)
    print("Computed technical indicators.")
    
    X, y = prepare_training_data(df)
    print("Prepared training data. Features shape:", X.shape)
    
    # Temporal Split Example:
    # Train: 2008-2018, Validation: 2019, Test: 2020-2023
    df["Year"] = df["Date"].dt.year
    train_df = df[df["Year"] <= 2018]
    val_df = df[df["Year"] == 2019]
    test_df = df[df["Year"] >= 2020]
    X_train, y_train = prepare_training_data(train_df)
    X_val, y_val = prepare_training_data(val_df)
    
    input_size = X_train.shape[1]
    model = train_model(X_train, y_train, input_size)
    
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"Model saved to {MODEL_SAVE_PATH}")
    
    # Evaluate on validation set
    X_val_tensor = torch.tensor(X_val.values, dtype=torch.float32).unsqueeze(1)
    model.eval()
    with torch.no_grad():
        val_outputs = model(X_val_tensor).squeeze()
        val_preds = (torch.sigmoid(val_outputs) > 0.5).int().numpy()
    print("Validation Accuracy:", accuracy_score(y_val, val_preds))
    print("Validation F1-Score:", f1_score(y_val, val_preds))
    
if __name__ == "__main__":
    main()
