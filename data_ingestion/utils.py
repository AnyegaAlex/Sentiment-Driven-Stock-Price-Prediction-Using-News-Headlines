# data_ingestion/utils.py
import requests

NEWS_API_KEY = ''  # API key
BASE_URL = 'https://newsapi.org/v2/everything'

def fetch_news(query="stocks", page_size=10):
    """
    Fetch financial news articles from NewsAPI.
    """
    params = {
        'q': query,
        'pageSize': page_size,
        'apiKey': NEWS_API_KEY,
        'language': 'en',
        'sortBy': 'publishedAt'
    }
    response = requests.get(BASE_URL, params=params)
    if response.status_code == 200:
        return response.json().get('articles', [])
    else:
        print(f"Error: {response.status_code}")
        return []

# data_ingestion/utils.py (Add to existing file)
import yfinance as yf

def fetch_stock_data(ticker, start_date, end_date):
    """
    Fetch historical stock prices for a given ticker.
    """
    try:
        data = yf.download(ticker, start=start_date, end=end_date)
        return data
    except Exception as e:
        print(f"Error fetching stock data: {e}")
        return None

# data_ingestion/utils.py (Add to existing file)
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk

nltk.download('vader_lexicon')

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(headlines):
    """
    Analyze sentiment for a list of headlines.
    """
    sentiments = []
    for headline in headlines:
        scores = analyzer.polarity_scores(headline)
        sentiment = {
            "headline": headline,
            "positive": scores['pos'],
            "neutral": scores['neu'],
            "negative": scores['neg'],
            "compound": scores['compound']
        }
        sentiments.append(sentiment)
    return sentiments
