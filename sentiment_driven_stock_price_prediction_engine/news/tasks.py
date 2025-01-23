from celery import shared_task
import requests
from .models import NewsArticle
from sentiment_analysis import analyze_sentiment  # Custom sentiment function

@shared_task
def fetch_news():
    response = requests.get(f'https://newsapi.org/v2/everything?q=stocks&apiKey={NEWS_API_KEY}')
    articles = response.json().get('articles', [])
    for article in articles:
        sentiment = analyze_sentiment(article['title'])
        NewsArticle.objects.create(headline=article['title'], sentiment=sentiment)
