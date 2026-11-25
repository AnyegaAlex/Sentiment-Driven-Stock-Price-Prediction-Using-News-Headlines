"""Send weekly activity summaries only to users with recorded explicit opt-in."""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode

from authentication.models import User
from authentication.utils import (
    generate_weekly_digest_unsubscribe_token,
    send_email_sync,
)
from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send weekly digest emails to users who explicitly opted in'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--quiet', action='store_true')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        quiet = options['quiet']

        try:
            connection.close_if_unusable_or_obsolete()
            users = User.objects.filter(
                email_verified=True,
                is_active=True,
                deletion_requested_at__isnull=True,
                user_preferences__weekly_digest=True,
                user_preferences__weekly_digest_opted_in_at__isnull=False,
            ).distinct()

            total_users = users.count()
            if total_users == 0:
                if not quiet:
                    self.stdout.write(self.style.SUCCESS('No users opted in for weekly digest'))
                return

            if not quiet:
                self.stdout.write(f'Found {total_users} opted-in user(s) for weekly digest')

            week_ago = timezone.now() - timedelta(days=7)
            sent = 0
            failed = 0

            for user in users.iterator(chunk_size=100):
                # Re-check immediately before sending to honour a recent opt-out.
                still_opted_in = User.objects.filter(
                    pk=user.pk,
                    email_verified=True,
                    is_active=True,
                    deletion_requested_at__isnull=True,
                    user_preferences__weekly_digest=True,
                    user_preferences__weekly_digest_opted_in_at__isnull=False,
                ).exists()
                if not still_opted_in:
                    continue

                predictions = Prediction.objects.filter(
                    user=user,
                    created_at__gte=week_ago,
                )
                predictions_count = predictions.count()
                accuracy = None
                if predictions_count:
                    correct = predictions.filter(is_correct=True).count()
                    accuracy = round((correct / predictions_count) * 100, 1)

                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = generate_weekly_digest_unsubscribe_token(user)
                unsubscribe_url = (
                    f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe-weekly-digest"
                    f"?uid={uid}&token={token}"
                )
                dashboard_url = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard"
                safe_username = escape(user.username)
                accuracy_label = f'{accuracy}%' if accuracy is not None else 'N/A'

                subject = 'Your Weekly Digest from Tickflow Intelligence'
                html_content = f"""
                <h1>Weekly Digest for {safe_username}</h1>
                <p>Here's your activity summary for the past week:</p>
                <ul>
                    <li>Predictions made: {predictions_count}</li>
                    <li>Accuracy: {accuracy_label}</li>
                </ul>
                <p>Visit your <a href="{dashboard_url}">dashboard</a> for more details.</p>
                <hr>
                <p>You are receiving this optional weekly digest because you opted in.</p>
                <p><a href="{unsubscribe_url}">Unsubscribe from the weekly digest</a></p>
                """
                plain_content = (
                    f"Your Weekly Digest from Tickflow Intelligence\n\n"
                    f"Predictions made: {predictions_count}\n"
                    f"Accuracy: {accuracy_label}\n\n"
                    f"Dashboard: {dashboard_url}\n\n"
                    f"Unsubscribe: {unsubscribe_url}\n"
                )

                if dry_run:
                    if not quiet:
                        self.stdout.write(f'Would send digest to user_id={user.pk}')
                    continue

                try:
                    delivered = send_email_sync(
                        subject=subject,
                        to_email=user.email,
                        html_content=html_content,
                        plain_content=plain_content,
                    )
                    if delivered:
                        sent += 1
                    else:
                        failed += 1
                except Exception as exc:
                    failed += 1
                    logger.warning(
                        'Weekly digest send failed for user_id=%s (%s)',
                        user.pk,
                        type(exc).__name__,
                    )

            if not quiet:
                if dry_run:
                    self.stdout.write('Dry-run mode: no emails sent')
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully sent {sent} weekly digest(s) (failed: {failed}).'
                        )
                    )
        except CommandError:
            raise
        except Exception as exc:
            logger.error('Weekly digest command failed (%s)', type(exc).__name__, exc_info=True)
            raise CommandError('Weekly digest command failed') from exc
        finally:
            connection.close()
