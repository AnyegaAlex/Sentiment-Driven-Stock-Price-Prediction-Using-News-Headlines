# backend/authentication/management/commands/resolve_predictions.py
from django.core.management.base import BaseCommand
from stocks.utils import resolve_all_pending_predictions  
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Resolve pending predictions older than 7 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days after which to resolve predictions'
        )

    def handle(self, *args, **options):
        days = options['days']
        self.stdout.write(f"Resolving predictions older than {days} days...")
        results = resolve_all_pending_predictions(resolution_days=days)
        self.stdout.write(
            self.style.SUCCESS(
                f"Resolved {results['resolved']} predictions, {results['failed']} failed."
            )
        )
        if results['failed'] > 0:
            self.stdout.write(self.style.WARNING("Some predictions could not be resolved."))