# news/management/commands/prune_news.py
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from news.models import ProcessedNews

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Prunes old news articles to keep the Neon database under storage limits. "
        "Also runs VACUUM ANALYZE to reclaim disk space on PostgreSQL."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=14,
            help='Number of days of data to keep (default: 14)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate the deletion without actually deleting data',
        )

    def handle(self, *args, **options):
        days_to_keep = options['days']
        dry_run = options['dry_run']
        
        # Ensure we use timezone-aware datetimes
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)

        self.stdout.write(
            self.style.WARNING(
                f"Starting prune. Keeping data published after {cutoff_date.isoformat()} "
                f"({days_to_keep} days)."
            )
        )

        # 1. Count how many we are going to delete (for observability)
        queryset = ProcessedNews.objects.filter(published_at__lt=cutoff_date)
        total_to_delete = queryset.count()

        if total_to_delete == 0:
            self.stdout.write(self.style.SUCCESS("No old articles found to prune. Database is clean."))
        else:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f"[DRY RUN] Would have deleted {total_to_delete} articles.")
                )
            else:
                self.stdout.write(f"Deleting {total_to_delete} articles...")
                try:
                    # Execute the deletion inside a transaction for safety
                    with transaction.atomic():
                        deleted_count, _ = queryset.delete()
                    
                    self.stdout.write(
                        self.style.SUCCESS(f"Successfully deleted {deleted_count} records.")
                    )
                    logger.info(f"Pruned {deleted_count} news articles older than {days_to_keep} days.")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to delete records: {e}"))
                    logger.error(f"Pruning failed: {e}", exc_info=True)
                    return

        # 2. Reclaim disk space (PostgreSQL specific)
        # Simply deleting rows in Postgres doesn't shrink the file size on disk.
        # VACUUM ANALYZE reclaims the space for Neon.
        if not dry_run and connection.vendor == 'postgresql':
            self.stdout.write("Running VACUUM ANALYZE to reclaim space on Neon...")
            try:
                # We need to set autocommit temporarily for VACUUM
                with connection.cursor() as cursor:
                    old_isolation_level = connection.connection.isolation_level
                    connection.connection.set_isolation_level(0) # Autocommit
                    cursor.execute("VACUUM ANALYZE news_processednews;")
                    connection.connection.set_isolation_level(old_isolation_level)
                self.stdout.write(self.style.SUCCESS("Database vacuumed successfully."))
            except Exception as e:
                # Vacuum failures are usually non-critical and shouldn't crash the pipeline
                self.stdout.write(self.style.WARNING(f"VACUUM failed: {e}"))
                logger.warning(f"VACUUM failed: {e}")

        self.stdout.write(self.style.SUCCESS("Pruning process complete."))