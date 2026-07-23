"""
Management command to update cached prediction accuracy for all users.

Runs daily at 5:00 AM to keep profile page fast.
"""

import logging
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, Q
from django.db import transaction

from authentication.models import User
from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Recalculate and update prediction_accuracy on User model.
    """
    help = 'Update cached prediction accuracy for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of users to process in one batch (default: 100)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        batch_size = options.get('batch_size', 100)
        dry_run = options.get('dry_run', False)

        # Get users with at least one resolved prediction
        users_with_predictions = User.objects.filter(
            predictions__is_correct__isnull=False
        ).distinct()

        total_users = users_with_predictions.count()

        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('No users with resolved predictions'))
            return

        self.stdout.write(f'Found {total_users} user(s) with resolved predictions')

        if dry_run:
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
                    ).aggregate(avg=Avg('is_correct'))['avg']

                    # Convert to percentage (0-100)
                    accuracy = round((avg or 0) * 100, 1)

                    # Update the user
                    user.prediction_accuracy = accuracy
                    user.save(update_fields=['prediction_accuracy'])
                    updated += 1

            self.stdout.write(f'Processed {min(batch_start + batch_size, total_users)} users')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated prediction accuracy for {updated} users')
        )

        logger.info(f'Updated prediction accuracy for {updated} users')