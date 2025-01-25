#update the NewsArticle model to match the example response from the documentation & include the required fields
from django.db import models
from django.utils import timezone

class NewsArticle(models.Model):
    title = models.TextField()
    author = models.CharField(max_length=100, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)  # Make nullable
    source = models.CharField(max_length=100)
    url = models.URLField()
    url_to_image = models.URLField(null=True, blank=True)
    sentiment = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Track when the article was saved

    def __str__(self):
        return self.title[:50]  # Return the first 50 characters of the title