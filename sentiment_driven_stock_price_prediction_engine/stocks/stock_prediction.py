import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Load datasets
stock_data = pd.read_csv("../data/stocks/FNSPID_stock_price_dataset_IBM.csv")
sentiment_data = pd.read_csv("../data/news/sentiment_predictions.csv")

# Merge sentiment with stock data
stock_data["date"] = pd.to_datetime(stock_data["date"])
sentiment_data["date"] = pd.to_datetime(sentiment_data["date"])
merged_data = pd.merge(stock_data, sentiment_data, on="date", how="left").fillna("neutral")

# Encode sentiment
sentiment_mapping = {"negative": -1, "neutral": 0, "positive": 1}
merged_data["sentiment_score"] = merged_data["sentiment"].map(sentiment_mapping)

# Define features and target
features = ["open", "high", "low", "close", "volume", "sentiment_score"]
target = "price_movement"  # 1 = Up, 0 = No change, -1 = Down

# Create price movement labels
merged_data["price_movement"] = (merged_data["close"].shift(-1) > merged_data["close"]).astype(int)

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(merged_data[features], merged_data[target], test_size=0.2, random_state=42)

# Train Random Forest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy:.2f}")

# Save model
import joblib
joblib.dump(model, "stock_price_model.pkl")
