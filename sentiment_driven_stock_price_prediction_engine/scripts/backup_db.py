"""
Database backup script for Tickflow Sentiment.
Creates daily backups and uploads to S3 or local storage.
"""

import os
import subprocess
import datetime
import logging
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backup the database to S3 or local storage'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--local',
            action='store_true',
            help='Save backup locally instead of S3',
        )
    
    def handle(self, *args, **options):
        local = options.get('local', False)
        
        # Create backup directory
        backup_dir = settings.BASE_DIR / 'backups'
        backup_dir.mkdir(exist_ok=True)
        
        # Generate filename
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"tickflow_backup_{timestamp}.sql.gz"
        filepath = backup_dir / filename
        
        # Get database config
        db_settings = settings.DATABASES['default']
        db_name = db_settings['NAME']
        db_user = db_settings['USER']
        db_host = db_settings['HOST']
        db_port = db_settings.get('PORT', 5432)
        
        self.stdout.write(f"Starting backup of {db_name}...")
        
        try:
            # Create backup using pg_dump
            cmd = [
                'pg_dump',
                f'postgresql://{db_user}@localhost:{db_port}/{db_name}',
                '--clean',
                '--if-exists',
                '--no-owner',
                '--no-privileges',
            ]
            
            with open(filepath, 'wb') as f:
                subprocess.check_call(cmd, stdout=f)
            
            self.stdout.write(self.style.SUCCESS(f"Backup created: {filepath}"))
            
            # Upload to S3 or keep local
            if not local:
                self.upload_to_s3(filepath, filename)
            
            # Clean old backups
            self.clean_old_backups(backup_dir)
            
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Backup failed: {e}"))
            raise
    
    def upload_to_s3(self, filepath, filename):
        """Upload backup to S3."""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            s3 = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            )
            
            bucket = os.getenv('BACKUP_S3_BUCKET')
            if not bucket:
                logger.warning("BACKUP_S3_BUCKET not set – skipping S3 upload")
                return
            
            key = f"backups/{filename}"
            s3.upload_file(str(filepath), bucket, key)
            logger.info(f"Backup uploaded to S3: s3://{bucket}/{key}")
            
        except ImportError:
            logger.warning("boto3 not installed – skipping S3 upload")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
    
    def clean_old_backups(self, backup_dir):
        """Remove backups older than retention period."""
        retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', 30))
        cutoff = datetime.datetime.now() - datetime.timedelta(days=retention_days)
        
        for file in backup_dir.glob('*.sql.gz'):
            mtime = datetime.datetime.fromtimestamp(file.stat().st_mtime)
            if mtime < cutoff:
                file.unlink()
                logger.info(f"Removed old backup: {file.name}")