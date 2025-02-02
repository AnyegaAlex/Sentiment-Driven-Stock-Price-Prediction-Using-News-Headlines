import joblib
import pandas as pd

# Load trained model
MODEL_PATH = "models/stock_price_predictor.pkl"
try:
    model = joblib.load(MODEL_PATH)
    print("✅ Stock prediction model loaded successfully.")
except Exception as e:
    print("❌ ERROR: Model could not be loaded!", str(e))
    exit()

# Sample test data (mock data - replace with real IBM stock data)
test_data = pd.DataFrame({
    "sentiment_score": [0.2, -0.5, 0.8],  # Example sentiment scores
    "moving_avg_5": [135, 140, 138],      # 5-day moving average
    "moving_avg_10": [132, 138, 137],     # 10-day moving average
})

# Predict stock movement
predictions = model.predict(test_data)

print("\n📈 Stock Movement Predictions:", predictions)
