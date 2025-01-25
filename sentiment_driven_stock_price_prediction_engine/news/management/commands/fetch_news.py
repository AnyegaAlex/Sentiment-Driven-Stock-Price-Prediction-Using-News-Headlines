from django.core.management.base import BaseCommand
from news.tasks import fetch_news  # Import the Celery task

class Command(BaseCommand):
    help = "Fetch news articles and analyze sentiment"

    def handle(self, *args, **kwargs):
        # Trigger the Celery task
        fetch_news.delay()
        self.stdout.write(self.style.SUCCESS("News fetching task triggered."))