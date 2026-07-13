from django.core.management.base import BaseCommand
from authentication.models import APIKey

class Command(BaseCommand):
    help = 'Generate a new API key'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Name of the key (e.g., Frontend)')

    def handle(self, *args, **options):
        key = APIKey.objects.create(name=options['name'])
        self.stdout.write(self.style.SUCCESS(f'Generated API Key: {key.key}'))
        self.stdout.write(self.style.SUCCESS(f'For: {key.name}'))