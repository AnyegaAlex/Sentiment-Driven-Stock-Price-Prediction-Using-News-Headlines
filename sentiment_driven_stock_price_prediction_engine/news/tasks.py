from celery import shared_task
from .models import NewsArticle
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
import os

@shared_task
def fetch_news():
    """Fetch news articles from NewsAPI and perform sentiment analysis."""
    api_key = os.getenv("NEWS_API_KEY")
    url = f"https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey={api_key}"
    
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        articles = data.get('articles', [])
        
        analyzer = SentimentIntensityAnalyzer()

        for article in articles:
            headline = article['title']
            sentiment_score = analyzer.polarity_scores(headline)['compound']
            
            # Determine sentiment label
            if sentiment_score > 0.05:
                sentiment = 'positive'
            elif sentiment_score < -0.05:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'

            # Save to database
            NewsArticle.objects.get_or_create(
                headline=headline,
                sentiment=sentiment,
            )
    else:
        raise Exception(f"Failed to fetch news: {response.status_code}")
