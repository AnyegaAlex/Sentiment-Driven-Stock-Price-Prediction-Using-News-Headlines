"""
Management command to update cached prediction accuracy for all users.

Runs daily at 5:00 AM to keep profile page fast.

Usage:
    python manage.py update_prediction_accuracy [--batch-size N] [--dry-run] [--quiet]

Author: Tickflow Capital
Version: 1.1.1
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.db.models import Avg, IntegerField
from django.db.models.functions import Cast  

from authentication.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Update cached prediction accuracy for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of users to process per transaction'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress detailed output (only errors)'
        )

    def handle(self, *args, **options):
        batch_size = options.get('batch_size', 100)
        dry_run = options.get('dry_run', False)
        quiet = options.get('quiet', False)

        try:
            connection.close_if_unusable_or_obsolete()

            # Get users with at least one resolved prediction
            users_with_predictions = User.objects.filter(
                predictions__is_correct__isnull=False
            ).distinct()

            total_users = users_with_predictions.count()
            if total_users == 0:
                if not quiet:
                    self.stdout.write(self.style.SUCCESS('No users with resolved predictions'))
                return

            if not quiet:
                self.stdout.write(f'Found {total_users} user(s) with resolved predictions')

            if dry_run:
                if not quiet:
                    self.stdout.write('Dry-run mode – no changes made')
                return

            updated = 0
            for batch_start in range(0, total_users, batch_size):
                batch = users_with_predictions[batch_start:batch_start + batch_size]
                with transaction.atomic():
                    for user in batch:
                        # Calculate average accuracy for this user
                        avg = user.predictions.filter(
                            is_correct__isnull=False
                        ).aggregate(avg=Avg(Cast('is_correct', IntegerField())))['avg'] 

                        accuracy = round((avg or 0) * 100, 1)
                        user.prediction_accuracy = accuracy
                        user.save(update_fields=['prediction_accuracy'])
                        updated += 1

                if not quiet:
                    self.stdout.write(f'Processed {min(batch_start + batch_size, total_users)} users')

            if not quiet:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully updated prediction accuracy for {updated} users')
                )

            logger.info(f'Updated prediction accuracy for {updated} users')

            connection.close()

        except Exception as e:
            logger.error(f"Update prediction accuracy failed: {e}", exc_info=True)
            self.stderr.write(self.style.ERROR(f"Fatal error: {e}"))
            raise CommandError(f"Command failed: {e}")