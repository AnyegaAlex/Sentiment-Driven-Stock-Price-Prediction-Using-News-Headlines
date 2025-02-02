import pandas as pd
import chardet

# Define file paths
news_path = "../data/news/FNSPID_Financial_News_Dataset.csv"
sentiment_path = "../data/news/Sentiment_Analysis_for_Financial_News.csv"
stock_path = "../data/stocks/FNSPID_Stock_Price_Dataset_IBM.csv"

#Function to detect encoding (optimized)
def detect_encoding(file_path, num_bytes=100000):  # Read first 100 KB
    with open(file_path, 'rb') as f:
        raw_data = f.read(num_bytes)  # Read only a portion of the file
        result = chardet.detect(raw_data)
    return result['encoding']

# Detect encoding for each file
try:
    print("News file encoding:", detect_encoding(news_path))
    print("Sentiment file encoding:", detect_encoding(sentiment_path))
    print("Stock file encoding:", detect_encoding(stock_path))
except Exception as e:
    print("\n❌ ERROR: Could not detect encoding for one or more files:", str(e))

# ✅ Test reading first few rows (Only loads small chunks to prevent memory overload)
try:
    news_df = pd.read_csv(news_path, encoding=detect_encoding(news_path), nrows=5)
    sentiment_df = pd.read_csv(sentiment_path, encoding=detect_encoding(sentiment_path), nrows=5)
    stock_df = pd.read_csv(stock_path, encoding=detect_encoding(stock_path), nrows=5)

    print("\n✅ News Data Sample:\n", news_df.head())
    print("\n✅ Sentiment Data Sample:\n", sentiment_df.head())
    print("\n✅ Stock Data Sample:\n", stock_df.head())

#checks for missing data
#print(news_df.info())
#print(sentiment_df.info())
#print(stock_df.info())


except Exception as e:
    print("\n❌ ERROR: Could not load one or more CSV files:", str(e))
