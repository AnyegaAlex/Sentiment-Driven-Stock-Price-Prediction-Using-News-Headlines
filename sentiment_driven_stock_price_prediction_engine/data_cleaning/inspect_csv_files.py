import pandas as pd
import os

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIRS = {
    "news": os.path.abspath(os.path.join(BASE_DIR, "../data/news")),
    "sentiment": os.path.abspath(os.path.join(BASE_DIR, "../data/news")),
    "stocks": os.path.abspath(os.path.join(BASE_DIR, "../data/stocks"))
}

FILES = {
    "news": [
        "cnbc_headlines.csv",
        "reuters_headlines.csv",
        "guardian_headlines.csv"
    ],
    "sentiment": [
        "Sentiment_Analysis_for_Financial_News.csv",
        "FNSPID_Financial_News_Dataset.csv"
    ],
    "stocks": [
        "FNSPID_Stock_Price_Dataset_IBM.csv"
    ]
}

# Function to inspect CSV files efficiently
def inspect_csv(file_path, category):
    if not os.path.exists(file_path):
        print(f"⚠️ File not found: {file_path}\n")
        return

    print(f"\n🔍 Inspecting {category.upper()} dataset: {os.path.basename(file_path)}")

    # Try different encodings if UTF-8 fails
    encodings = ["utf-8", "ISO-8859-1", "latin1"]
    df = None

    for encoding in encodings:
        try:
            # Load in chunks for large datasets
            chunk = pd.read_csv(file_path, encoding=encoding, low_memory=False, iterator=True, chunksize=10000)
            df = next(chunk)  # Load only the first chunk for inspection
            print(f"✅ Successfully loaded with {encoding} encoding: {file_path}")
            break
        except Exception as e:
            print(f"❌ Failed to load with {encoding}: {e}")

    if df is None:
        print(f"❌ Unable to read {file_path} with available encodings.\n")
        return

    # Display first few rows
    print(df.head())

    # Display column info
    print("\n📊 Data Summary:")
    print(df.info())

    # Check for missing values
    missing_values = df.isnull().sum()
    print("\n🚨 Missing Values:")
    print(missing_values[missing_values > 0])

    # Check for duplicate rows
    duplicate_count = df.duplicated().sum()
    print(f"\n🔁 Duplicate Rows: {duplicate_count}")

    # Check data types
    print("\n🔤 Data Types:")
    print(df.dtypes)

    # Summary statistics (limit output for large datasets)
    print("\n📈 Summary Statistics:")
    print(df.describe(include="all").transpose().head(10))  # Show only first 10 rows of summary

# Run inspection for all files
for category, file_list in FILES.items():
    for file in file_list:
        inspect_csv(os.path.join(DATA_DIRS[category], file), category)
