from django.test import TestCase
from .models import NewsArticle

class NewsArticleTestCase(TestCase):
    def test_news_article_creation(self):
        article = NewsArticle.objects.create(
            headline="Test Headline",
            source="Test Source",
            sentiment_score=0.5,
            sentiment_label="positive"
        )
        self.assertEqual(article.headline, "Test Headline")