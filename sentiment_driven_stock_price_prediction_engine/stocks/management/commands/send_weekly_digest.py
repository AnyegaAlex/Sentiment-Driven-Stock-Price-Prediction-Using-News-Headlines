"""
Management command to send weekly digest emails to users.

Runs Monday at 8:00 AM to improve engagement and retention.

Usage:
    python manage.py send_weekly_digest [--dry-run] [--quiet]

Author: Tickflow Capital
Version: 1.1.0
"""

import logging
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone

from authentication.models import User
from authentication.utils import send_email_async
from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send weekly digest emails to users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress detailed output (only errors)',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        quiet = options.get('quiet', False)

        try:
            connection.close_if_unusable_or_obsolete()

            # Get users who want weekly digest and have verified email
            users = User.objects.filter(
                email_verified=True,
                user_preferences__weekly_digest=True,
                is_active=True
            )

            total_users = users.count()
            if total_users == 0:
                if not quiet:
                    self.stdout.write(self.style.SUCCESS('No users opted in for weekly digest'))
                return

            if not quiet:
                self.stdout.write(f'Found {total_users} user(s) for weekly digest')

            week_ago = timezone.now() - timedelta(days=7)
            sent = 0
            failed = 0

            for user in users:
                predictions = Prediction.objects.filter(
                    user=user,
                    created_at__gte=week_ago
                )
                predictions_count = predictions.count()
                if predictions_count > 0:
                    correct = predictions.filter(is_correct=True).count()
                    accuracy = round((correct / predictions_count) * 100, 1)
                else:
                    accuracy = None

                # Build digest content (expand as needed)
                subject = 'Your Weekly Digest from Tickflow Intelligence'
                html_content = f"""
                <h1>Weekly Digest for {user.username}</h1>
                <p>Here's your activity summary for the past week:</p>
                <ul>
                    <li>Predictions made: {predictions_count}</li>
                    <li>Accuracy: {accuracy if accuracy is not None else 'N/A'}%</li>
                </ul>
                <p>Visit your dashboard for more details.</p>
                """

                if dry_run:
                    if not quiet:
                        self.stdout.write(f'Would send to {user.email}')
                else:
                    try:
                        send_email_async(
                            subject=subject,
                            to_email=user.email,
                            html_content=html_content
                        )
                        sent += 1
                    except Exception as e:
                        failed += 1
                        logger.warning(f"Failed to send digest to {user.email}: {e}")

            if not dry_run:
                if not quiet:
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully sent {sent} weekly digest(s) (failed: {failed})')
                    )
                logger.info(f'Sent {sent} weekly digest emails, failed {failed}')
            else:
                if not quiet:
                    self.stdout.write('Dry-run mode – no emails sent')

            connection.close()

        except Exception as e:
            logger.error(f"Send weekly digest failed: {e}", exc_info=True)
            self.stderr.write(self.style.ERROR(f"Fatal error: {e}"))
            raise CommandError(f"Command failed: {e}")

        if not quiet:
            self.stdout.write(self.style.SUCCESS("Done."))