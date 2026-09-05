"""
Management command to resolve pending stock predictions.

Resolves predictions that are older than a specified number of days (default 7).
This command is intended to be run periodically (e.g., daily via cron-job.org).

Usage:
    python manage.py resolve_predictions [--days N]

Example:
    python manage.py resolve_predictions --days 7

Author: Tickflow Capital
Version: 1.0.0
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from stocks.utils import resolve_all_pending_predictions

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Resolve pending predictions older than a specified number of days.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days after which to resolve predictions (default: 7)'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress detailed output (only errors)'
        )

    def handle(self, *args, **options):
        days = options['days']
        quiet = options.get('quiet', False)

        if not quiet:
            self.stdout.write(f"Resolving predictions older than {days} days...")

        try:
            # Close any stale connections before the heavy work
            connection.close_if_unusable_or_obsolete()

            # Call the utility function
            results = resolve_all_pending_predictions(resolution_days=days)

            resolved = results.get('resolved', 0)
            failed = results.get('failed', 0)
            total = resolved + failed

            if not quiet:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Resolved {resolved} predictions, {failed} failed (total {total})."
                    )
                )

            # Log structured info
            logger.info(
                f"resolve_predictions completed: resolved={resolved}, failed={failed}, days={days}"
            )

            # If there were failures, log a warning and optionally exit with non‑zero code
            if failed > 0:
                logger.warning(f"Some predictions could not be resolved: {failed} failed.")
                if not quiet:
                    self.stdout.write(self.style.WARNING("Some predictions could not be resolved."))
                # For cron, you may want to exit with non‑zero to signal failure
                # raise CommandError(f"{failed} predictions failed to resolve")
                # However, we don't want to break the cron job if it's retryable, so we'll just warn.

            # Ensure connections are closed
            connection.close()

        except Exception as e:
            logger.error(f"resolve_predictions command failed: {e}", exc_info=True)
            self.stderr.write(
                self.style.ERROR(f"Fatal error: {e}")
            )
            # Re-raise to let Django handle the exit code
            raise CommandError(f"Command failed: {e}")

        if not quiet:
            self.stdout.write(self.style.SUCCESS("Done."))