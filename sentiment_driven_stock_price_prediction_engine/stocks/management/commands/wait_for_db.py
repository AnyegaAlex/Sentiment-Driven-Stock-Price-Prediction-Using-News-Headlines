from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError
import time


class Command(BaseCommand):
    help = 'Wait for database to be available'

    def handle(self, *args, **options):
        self.stdout.write('Waiting for database...')
        max_retries = 30
        for attempt in range(max_retries):
            try:
                connections['default'].cursor()
                break
            except OperationalError:
                self.stdout.write(f'Database unavailable, waiting 1 second... (attempt {attempt+1}/{max_retries})')
                time.sleep(1)
        else:
            self.stdout.write(self.style.ERROR('Database connection failed'))
            return
        
        self.stdout.write(self.style.SUCCESS('Database available'))