from django.db import models

class NewsArticle(models.Model):
    headline = models.TextField()
    sentiment = models.CharField(max_length=10)  # 'positive', 'negative', 'neutral'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.headline[:50]
