from sklearn.ensemble import RandomForestRegressor  # Changed to Regressor
import pandas as pd
from django.db import models

class StockData(models.Model):
    symbol = models.CharField(max_length=10)
    date = models.DateField()
    open_price = models.FloatField()
    close_price = models.FloatField()
    volume = models.BigIntegerField(default=0)
    sentiment_score = models.FloatField()

    @property
    def price_movement(self):
        return 1 if self.close_price > self.open_price else 0


def train_model(stock_df, news_df):
    try:
        # Merge stock data and news data on the date
        merged_df = pd.merge(stock_df, news_df, left_on="date", right_on="published_at", how="inner")

        # Debug: Inspect the merged DataFrame
        print("Merged DataFrame:")
        print(merged_df.head())
        print("Merged DataFrame columns:", merged_df.columns)
        print("Merged DataFrame dtypes:", merged_df.dtypes)

        # Ensure correct data types
        merged_df['volume'] = pd.to_numeric(merged_df['volume'], errors='coerce')
        merged_df['sentiment_score'] = pd.to_numeric(merged_df['sentiment_score'], errors='coerce')

        # Debug: Check for missing values
        print("Missing values:")
        print(merged_df.isnull().sum())

        # Drop rows with missing values
        merged_df = merged_df.dropna()

        # Features and target
        X = merged_df[['open_price', 'close_price', 'volume', 'sentiment_score']]
        y = merged_df['sentiment_score']  # Continuous target

        # Debug: Check shapes and contents of X and y
        print("Features (X):")
        print(X.head())
        print("Features shape:", X.shape)
        print("Target (y):")
        print(y.head())
        print("Target shape:", y.shape)

        # Ensure X and y are NumPy arrays
        X = X.values  # Convert to NumPy array
        y = y.values  # Convert to NumPy array

        # Debug: Check shapes after conversion
        print("Features shape (after conversion):", X.shape)
        print("Target shape (after conversion):", y.shape)

        # Initialize RandomForestRegressor
        model = RandomForestRegressor()

        # Fit the model with the data
        model.fit(X, y)
        print("Model training complete!")

        # Return the trained model
        return model

    except Exception as e:
        print(f"Error during model training: {e}")
        raise