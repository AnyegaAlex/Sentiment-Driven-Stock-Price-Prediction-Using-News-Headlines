# management/commands/clean_duplicates.py python manage.py clean_duplicates
from django.core.management.base import BaseCommand
from django.db import transaction
from .models import ProcessedNews

class Command(BaseCommand):
    help = 'Remove duplicate articles'

    def handle(self, *args, **options):
        duplicates = ProcessedNews.objects.values('title_hash', 'symbol') \
            .annotate(count=models.Count('id')) \
            .filter(count__gt=1)

        for dup in duplicates:
            keep = ProcessedNews.objects.filter(
                title_hash=dup['title_hash'],
                symbol=dup['symbol']
            ).earliest('published_at')
            
            ProcessedNews.objects.filter(
                title_hash=dup['title_hash'],
                symbol=dup['symbol']
            ).exclude(pk=keep.pk).delete()