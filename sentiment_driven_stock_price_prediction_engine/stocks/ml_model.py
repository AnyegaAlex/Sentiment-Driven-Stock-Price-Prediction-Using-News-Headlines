import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib

def prepare_dataset(stock_data, news_data):

    # Convert news_data from QuerySet to DataFrame
    news_df = pd.DataFrame(list(news_data.values()))

    # Check if the 'sentiment' column exists
    if 'sentiment' in news_df.columns:
        # Convert sentiment to sentiment_score (numeric values)
        sentiment_mapping = {
            'positive': 1,
            'neutral': 0,
            'negative': -1
        }

        # Apply the sentiment mapping to create a valid sentiment_score
        news_df['sentiment_score'] = news_df['sentiment'].map(sentiment_mapping)

        # Ensure that null values are replaced with a default value (e.g., 0 or any logic you prefer)
        news_df['sentiment_score'] = news_df['sentiment_score'].fillna(0)

    # Convert stock_data to DataFrame (ensure stock_data is in the correct format)
    stock_df = pd.DataFrame(list(stock_data.values()))

    # Convert 'published_at' (or 'created_at') to datetime format if necessary
    news_df['created_at'] = pd.to_datetime(news_df['created_at'])

    # Use the 'created_at' column as the date for grouping
    sentiment_per_day = news_df.groupby(news_df['created_at'].dt.date)["sentiment_score"].mean().reset_index()

    # Merge stock data and sentiment scores (ensure correct column handling)
    merged_df = pd.merge(stock_df, sentiment_per_day, left_on='date', right_on='created_at', how="left")

    # Fix column naming issue (rename 'sentiment_score_y' to 'sentiment_score')
    merged_df['sentiment_score'] = merged_df['sentiment_score_y'].fillna(0)

    # Drop the extra sentiment_score column
    merged_df.drop(columns=['sentiment_score_y'], inplace=True)

    # Create binary price movement target
    merged_df["price_movement"] = merged_df["close_price"] > merged_df["open_price"]
    merged_df["price_movement"] = merged_df["price_movement"].astype(int)

    # Select relevant features
    features = ["open_price", "close_price", "volume", "sentiment_score"]
    X = merged_df[features]
    y = merged_df["price_movement"]

    return X, y

# Function to train the model
def train_model(X, y):
    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train a RandomForestClassifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate the model
    y_pred = model.predict(X_test)
    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred),
        "recall": recall_score(y_test, y_pred),
        "f1_score": f1_score(y_test, y_pred),
    }

    # Save the model
    joblib.dump(model, "stock_price_model.pkl")

    return metrics

# Function to predict using the trained model
def predict_movement(features):
    # Load the model
    model = joblib.load("stock_price_model.pkl")
    prediction = model.predict([features])
    return prediction[0]