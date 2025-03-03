import pandas as pd

csv_path = r'C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv'
df_csv = pd.read_csv(csv_path)

# Specify the output path for the Parquet file
parquet_path = r'C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.parquet'
df_csv.to_parquet(parquet_path, index=False)
