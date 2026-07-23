"""
Management command to send weekly digest emails to users.

Runs Monday at 8:00 AM to improve engagement and retention.
"""

import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Avg

from authentication.models import User
from authentication.utils import send_email_async
from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Send weekly digest emails to users who opted in.
    """
    help = 'Send weekly digest emails to users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        # Get users who want weekly digest and have verified email
        users = User.objects.filter(
            email_verified=True,
            user_preferences__weekly_digest=True,
            is_active=True
        )

        total_users = users.count()

        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('No users opted in for weekly digest'))
            return

        self.stdout.write(f'Found {total_users} user(s) for weekly digest')

        week_ago = timezone.now() - timedelta(days=7)

        sent = 0

        for user in users:
            # Calculate stats for the past week
            predictions = Prediction.objects.filter(
                user=user,
                created_at__gte=week_ago
            )

            predictions_count = predictions.count()
            if predictions_count > 0:
                correct = predictions.filter(is_correct=True).count()
                accuracy = round((correct / predictions_count) * 100, 1)
                recent_accuracy = accuracy
            else:
                recent_accuracy = None

            # Build digest content (simplified – you can expand)
            subject = 'Your Weekly Digest from Tickflow Sentiment'

            html_content = f"""
            <h1>Weekly Digest for {user.username}</h1>
            <p>Here's your activity summary for the past week:</p>
            <ul>
                <li>Predictions made: {predictions_count}</li>
                <li>Accuracy: {recent_accuracy}%</li>
            </ul>
            <p>Visit your dashboard for more details.</p>
            """

            if dry_run:
                self.stdout.write(f'Would send to {user.email}')
            else:
                send_email_async(
                    subject=subject,
                    to_email=user.email,
                    html_content=html_content
                )
                sent += 1

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully sent {sent} weekly digest(s)')
            )
            logger.info(f'Sent {sent} weekly digest emails')
        else:
            self.stdout.write('Dry-run mode – no emails sent')