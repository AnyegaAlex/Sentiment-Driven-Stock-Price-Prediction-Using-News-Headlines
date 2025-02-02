import pandas as pd
import numpy as np
import os

# Define base directory dynamically (the directory of this script)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define directories for raw data and where to save cleaned data
NEWS_DIR = os.path.abspath(os.path.join(BASE_DIR, "../data/news"))
STOCKS_DIR = os.path.abspath(os.path.join(BASE_DIR, "../data/stocks"))
CLEANED_DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "../data/cleaned_data"))
os.makedirs(CLEANED_DATA_DIR, exist_ok=True)

# Define file paths for the various datasets
news_files = [
    os.path.join(NEWS_DIR, "cnbc_headlines.csv"),
    os.path.join(NEWS_DIR, "reuters_headlines.csv"),
    os.path.join(NEWS_DIR, "guardian_headlines.csv")
]
sentiment_files = [
    os.path.join(NEWS_DIR, "Sentiment_Analysis_for_Financial_News.csv"),
    os.path.join(NEWS_DIR, "FNSPID_Financial_News_Dataset.csv")
]
stock_files = [
    os.path.join(STOCKS_DIR, "FNSPID_Stock_Price_Dataset_IBM.csv")
]

# --------------------------
# Helper functions
# --------------------------
def standardize_date(col):
    """
    Converts a date column to datetime and returns a formatted string
    in the "YYYY-MM-DD HH:MM:SS" format.
    """
    dt = pd.to_datetime(col, errors='coerce')
    # Drop rows where date conversion failed (NaT)
    return dt.dt.strftime('%Y-%m-%d %H:%M:%S')

def clean_text_column(col):
    """
    Lowercase and strip whitespace from a text column.
    """
    return col.astype(str).str.lower().str.strip()

def rename_columns(df, rename_map):
    """
    Renames columns based on the provided dictionary.
    """
    return df.rename(columns=rename_map)

# --------------------------
# 1️⃣ CLEANING NEWS DATA
# --------------------------
def clean_news_data(files):
    all_news = []
    
    for file in files:
        if not os.path.exists(file):
            print(f"⚠️ Warning: File {file} not found. Skipping.")
            continue

        # Use chunk processing to handle large files
        chunk_size = 50000  
        try:
            df_iter = pd.read_csv(file, chunksize=chunk_size, low_memory=False)
        except Exception as e:
            print(f"❌ Error reading {file}: {e}")
            continue
        
        for df in df_iter:
            # Standardize column names (assume headers may be inconsistent)
            df.columns = df.columns.str.strip().str.lower()
            
            # Rename columns for consistency: we expect "headline" and "time"
            # Adjust these if your files use "headlines" or "time" differently.
            rename_map = {}
            if "headlines" in df.columns:
                rename_map["headlines"] = "headline"
            if "time" in df.columns:
                rename_map["time"] = "date"
            df = rename_columns(df, rename_map)
            
            # Ensure essential columns exist
            if "headline" not in df.columns:
                print(f"⚠️ 'headline' column not found in {file}. Skipping chunk.")
                continue
            if "date" in df.columns:
                # Convert date and standardize format; drop rows with invalid dates
                df["date"] = pd.to_datetime(df["date"], errors='coerce')
                df = df.dropna(subset=["date"])
                # Format date as string "YYYY-MM-DD HH:MM:SS"
                df["date"] = df["date"].dt.strftime('%Y-%m-%d %H:%M:%S')
            else:
                print(f"⚠️ 'date' column not found in {file}.")
            
            # Clean the headline column
            df["headline"] = clean_text_column(df["headline"])
            
            # Drop rows with missing headlines
            df = df.dropna(subset=["headline"])
            
            # Drop duplicate headlines
            df = df.drop_duplicates(subset=["headline"], keep='last')
            
            all_news.append(df)
    
    if all_news:
        news_df = pd.concat(all_news, ignore_index=True)
        news_df.to_csv(os.path.join(CLEANED_DATA_DIR, "cleaned_news.csv"), index=False)
        print("✅ Cleaned news data saved as 'cleaned_news.csv'.")
    else:
        print("⚠️ No news data processed.")

# --------------------------
# 2️⃣ CLEANING SENTIMENT DATA
# --------------------------
def clean_sentiment_data(files):
    all_sentiments = []
    
    for file in files:
        if not os.path.exists(file):
            print(f"⚠️ Warning: File {file} not found. Skipping.")
            continue
        
        # Try a specific encoding if needed (e.g., for Sentiment_Analysis_for_Financial_News.csv)
        try:
            df = pd.read_csv(file, encoding="ISO-8859-1")
        except Exception as e:
            print(f"❌ Error reading {file} with ISO-8859-1: {e}")
            try:
                df = pd.read_csv(file)  # Fallback to default encoding
            except Exception as e:
                print(f"❌ Error reading {file}: {e}")
                continue
        
        df.columns = df.columns.str.strip().str.lower()
        
        # Rename columns if necessary
        # For example, if the file has weird headers, you can force rename them:
        # Assume we need columns "sentiment" and "headline"
        if "neutral" in df.columns or "positive" in df.columns or "negative" in df.columns:
            # If the column names are not clear, we assume the first column is sentiment and the second is headline
            df = df.rename(columns={df.columns[0]: "sentiment", df.columns[1]: "headline"})
        else:
            # If already named, you might adjust:
            if "headline" not in df.columns and "headlines" in df.columns:
                df = df.rename(columns={"headlines": "headline"})
        
        # Clean text columns
        if "headline" in df.columns:
            df["headline"] = clean_text_column(df["headline"])
            df = df.dropna(subset=["headline"])
            df = df.drop_duplicates(subset=["headline"], keep='last')
        else:
            print(f"⚠️ 'headline' column missing in {file}.")
        
        if "sentiment" in df.columns:
            df["sentiment"] = df["sentiment"].astype(str).str.lower().str.strip()
            df["sentiment"].fillna("neutral", inplace=True)
        else:
            print(f"⚠️ 'sentiment' column missing in {file}.")
        
        # Process date column if it exists
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors='coerce')
            df = df.dropna(subset=["date"])
            df["date"] = df["date"].dt.strftime('%Y-%m-%d %H:%M:%S')
        
        all_sentiments.append(df)
    
    if all_sentiments:
        sentiment_df = pd.concat(all_sentiments, ignore_index=True)
        sentiment_df.to_csv(os.path.join(CLEANED_DATA_DIR, "cleaned_sentiment.csv"), index=False)
        print("✅ Cleaned sentiment data saved as 'cleaned_sentiment.csv'.")
    else:
        print("⚠️ No sentiment data processed.")

# --------------------------
# 3️⃣ CLEANING STOCK PRICE DATA
# --------------------------
def clean_stock_data(files):
    all_stocks = []
    
    for file in files:
        if not os.path.exists(file):
            print(f"⚠️ Warning: File {file} not found. Skipping.")
            continue
        
        try:
            df = pd.read_csv(file)
        except Exception as e:
            print(f"❌ Error reading {file}: {e}")
            continue
        
        df.columns = df.columns.str.strip().str.lower()
        
        # Rename 'date' if necessary (e.g., if it is 'Date')
        if "date" not in df.columns and "date" in [c.lower() for c in df.columns]:
            df = df.rename(columns=lambda x: x.lower())
        
        # Standardize date format
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors='coerce')
            df = df.dropna(subset=["date"])
            df = df.drop_duplicates(subset=["date"], keep='last')
            df["date"] = df["date"].dt.strftime('%Y-%m-%d %H:%M:%S')
        else:
            print(f"⚠️ 'date' column missing in {file}.")
        
        # Convert price columns to numeric and fill missing values
        price_cols = ['open', 'high', 'low', 'close', 'adj close', 'volume']
        for col in price_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                # Use forward-fill then backward-fill for missing values
                df[col].fillna(method='ffill', inplace=True)
                df[col].fillna(method='bfill', inplace=True)
        
        all_stocks.append(df)
    
    if all_stocks:
        stock_df = pd.concat(all_stocks, ignore_index=True)
        stock_df.to_csv(os.path.join(CLEANED_DATA_DIR, "cleaned_stock_prices.csv"), index=False)
        print("✅ Cleaned stock price data saved as 'cleaned_stock_prices.csv'.")
    else:
        print("⚠️ No stock data processed.")

# --------------------------
# EXECUTE CLEANING FUNCTIONS
# --------------------------
print("Starting data cleaning...\n")
clean_news_data(news_files)
clean_sentiment_data(sentiment_files)
clean_stock_data(stock_files)
print("\n🎉 All datasets cleaned successfully!")
