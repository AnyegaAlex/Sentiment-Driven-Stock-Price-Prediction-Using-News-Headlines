from django.core.management.base import BaseCommand
from news.tasks import fetch_news

class Command(BaseCommand):
    help = "Fetch news articles and analyze sentiment"

    def handle(self, *args, **kwargs):
        fetch_news.delay()  # Call Celery task
        self.stdout.write(self.style.SUCCESS("News fetching task triggered."))
