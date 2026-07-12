from django.core.management.base import BaseCommand
from stocks.models import Prediction

class Command(BaseCommand):
    help = 'Delete old prediction records, keeping only the most recent 500 per symbol.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep',
            type=int,
            default=500,
            help='Number of most recent records to keep per symbol (default 500)'
        )

    def handle(self, *args, **options):
        keep = options['keep']
        Prediction.prune_old_records(max_per_symbol=keep)
        self.stdout.write(
            self.style.SUCCESS(f'Successfully pruned predictions, keeping {keep} per symbol.')
        )