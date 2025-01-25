import logging
from celery import shared_task
from news.models import NewsArticle
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
import os
from datetime import datetime

logger = logging.getLogger(__name__)

@shared_task
def fetch_news():
    """Fetch news articles from NewsAPI and perform sentiment analysis."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        logger.error("NEWS_API_KEY not set in environment variables.")
        raise Exception("NEWS_API_KEY not set in environment variables.")

    url = f"https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey={api_key}"
    
    response = requests.get(url)
    logger.info(f"API Response: {response.status_code}, {response.text}")  # Log the response

    if response.status_code == 200:
        data = response.json()
        articles = data.get('articles', [])
        
        if not articles:
            logger.warning("No articles found in the API response.")
            return

        analyzer = SentimentIntensityAnalyzer()

        for article in articles:
            # Extract fields from the API response
            title = article.get('title', '')
            author = article.get('author', '')
            content = article.get('content', '')
            description = article.get('description', '')
            published_at = article.get('publishedAt')
            source = article.get('source', {}).get('name', '')
            url = article.get('url', '')
            url_to_image = article.get('urlToImage', '')

            # Perform sentiment analysis on the title
            sentiment_score = analyzer.polarity_scores(title)['compound']
            if sentiment_score > 0.05:
                sentiment = 'positive'
            elif sentiment_score < -0.05:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'

            # Convert published_at to a datetime object
            published_at_datetime = None
            if published_at:
                try:
                    published_at_datetime = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
                except ValueError:
                    logger.warning(f"Invalid date format for article: {title}")

            # Save to database
            NewsArticle.objects.get_or_create(
                title=title,
                defaults={
                    'author': author,
                    'content': content,
                    'description': description,
                    'published_at': published_at_datetime,
                    'source': source,
                    'url': url,
                    'url_to_image': url_to_image,
                    'sentiment': sentiment,
                }
            )
            logger.info(f"Saved news article: {title}")
    else:
        logger.error(f"Failed to fetch news: {response.status_code}")
        raise Exception(f"Failed to fetch news: {response.status_code}")