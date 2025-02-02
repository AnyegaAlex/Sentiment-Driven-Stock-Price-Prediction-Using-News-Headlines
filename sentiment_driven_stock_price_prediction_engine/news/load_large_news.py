import pandas as pd

def process_large_csv(file_path, chunk_size=10000):
    """Process large CSV file in chunks to prevent memory overflow."""
    sentiment_results = []

    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        chunk["sentiment"] = chunk["headline"].apply(predict_sentiment)
        sentiment_results.append(chunk)

    result_df = pd.concat(sentiment_results)
    result_df.to_csv("../data/news/large_sentiment_predictions.csv", index=False)

if __name__ == "__main__":
    process_large_csv("../data/news/FNSPID_financial_news_dataset.csv")

