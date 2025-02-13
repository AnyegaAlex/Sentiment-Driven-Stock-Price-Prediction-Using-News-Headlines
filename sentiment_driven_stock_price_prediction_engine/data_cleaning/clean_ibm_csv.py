import os
import pandas as pd

file_path = r"C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\news\ibm_processed.csv"
cleaned_file_path = r"C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv"

# Check if file exists
if not os.path.exists(file_path):
    raise FileNotFoundError(f"Error: File not found at {file_path}. Check the path and try again.")

# Load the dataset
df = pd.read_csv(file_path)

# Convert 'Date' to datetime
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

# Remove missing values
df.dropna(inplace=True)

# Remove duplicates
df.drop_duplicates(inplace=True)

# Ensure numeric columns are properly formatted
numeric_cols = ["Open", "High", "Low", "Close", "Volume"]
df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")

# Save cleaned data
os.makedirs(os.path.dirname(cleaned_file_path), exist_ok=True)  # Create directory if it doesn't exist
df.to_csv(cleaned_file_path, index=False)


# Print the first few rows of the cleaned dataset
print(f"\n✅ Cleaned data saved to: {cleaned_file_path}\n")
print("📊 First 5 rows of the cleaned dataset:")
print(df.head())  # Print the first 5 rows