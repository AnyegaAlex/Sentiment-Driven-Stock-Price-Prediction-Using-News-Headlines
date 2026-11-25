"""Database backup implementation used by the backup_db management command."""

import datetime
import gzip
import logging
import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
import dj_database_url

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create a PostgreSQL backup and enforce local/S3 retention'

    def add_arguments(self, parser):
        parser.add_argument('--local', action='store_true',
                            help='Keep the backup locally and do not upload it to S3')
        parser.add_argument('--retention-days', type=int, default=None,
                            help='Override BACKUP_RETENTION_DAYS (default: 30)')

    def handle(self, *args, **options):
        retention_days = options['retention_days']
        if retention_days is None:
            retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
        if retention_days < 1 or retention_days > 3650:
            raise CommandError('--retention-days must be between 1 and 3650')

        local_only = options['local']
        bucket = os.getenv('BACKUP_S3_BUCKET', '').strip()
        if not local_only and not bucket:
            raise CommandError(
                'BACKUP_S3_BUCKET is required for a cloud backup. Use --local only for an intentional local backup.'
            )

        backup_dir = Path(settings.BASE_DIR) / 'backups'
        backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(backup_dir, 0o700)
        timestamp = timezone.now().astimezone(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        filename = f'tickflow_backup_{timestamp}.sql.gz'
        filepath = backup_dir / filename

        try:
            self._create_postgres_dump(filepath)
            self.stdout.write(f'Backup created: {filename}')

            if not local_only:
                client = self._get_s3_client()
                prefix = os.getenv('BACKUP_S3_PREFIX', 'backups/').strip('/')
                prefix = f'{prefix}/' if prefix else ''
                key = f'{prefix}{filename}'
                sse = os.getenv('BACKUP_S3_SERVER_SIDE_ENCRYPTION', 'AES256').strip()
                if sse not in ('AES256', 'aws:kms'):
                    raise CommandError('BACKUP_S3_SERVER_SIDE_ENCRYPTION must be AES256 or aws:kms.')
                extra_args = {'ServerSideEncryption': sse}
                if sse == 'aws:kms':
                    kms_key_id = os.getenv('BACKUP_S3_KMS_KEY_ID', '').strip()
                    if not kms_key_id:
                        raise CommandError('BACKUP_S3_KMS_KEY_ID is required when using aws:kms.')
                    extra_args['SSEKMSKeyId'] = kms_key_id
                client.upload_file(str(filepath), bucket, key, ExtraArgs=extra_args)
                logger.info('Database backup uploaded to configured object storage.')
                self._delete_expired_s3_backups(client, bucket, prefix, retention_days)

            self._delete_expired_local_backups(backup_dir, retention_days)
            self.stdout.write(self.style.SUCCESS('Backup and retention completed.'))
        except CommandError:
            raise
        except Exception as exc:
            logger.error('Database backup failed (%s)', type(exc).__name__, exc_info=True)
            raise CommandError('Database backup or retention failed; inspect service logs.') from exc

    def _create_postgres_dump(self, filepath: Path):
        backup_database_url = os.getenv('BACKUP_DATABASE_URL', '').strip()
        if backup_database_url:
            db = dj_database_url.parse(
                backup_database_url,
                conn_max_age=0,
                ssl_require=True,
            )
        else:
            db = settings.DATABASES['default']

        if not db.get('ENGINE', '').endswith('postgresql'):
            raise CommandError('Database backups require PostgreSQL; the configured database is not PostgreSQL.')

        host = db.get('HOST')
        name = db.get('NAME')
        user = db.get('USER')
        if not host or not name or not user:
            raise CommandError('PostgreSQL host, database name and user must be configured.')
        if 'pooler' in str(host).lower():
            raise CommandError(
                'The backup connection points to a pooled PostgreSQL endpoint. '
                'Set BACKUP_DATABASE_URL to the provider direct connection string for pg_dump.'
            )

        command = [
            'pg_dump',
            '--host', str(host),
            '--port', str(db.get('PORT') or 5432),
            '--username', str(user),
            '--dbname', str(name),
            '--no-owner',
            '--no-privileges',
            '--format=plain',
        ]
        env = os.environ.copy()
        if db.get('PASSWORD'):
            env['PGPASSWORD'] = str(db['PASSWORD'])
        env['PGSSLMODE'] = str(db.get('OPTIONS', {}).get('sslmode', 'require'))
        env.setdefault('PGCONNECT_TIMEOUT', '10')

        try:
            with gzip.open(filepath, 'wb') as output:
                result = subprocess.run(
                    command, stdout=output, stderr=subprocess.PIPE, env=env, check=False
                )
            if result.returncode != 0:
                raise CommandError(
                    f'pg_dump exited with status {result.returncode}; no usable backup was produced.'
                )
            os.chmod(filepath, 0o600)
        except FileNotFoundError as exc:
            filepath.unlink(missing_ok=True)
            raise CommandError('pg_dump is not installed in this runtime image.') from exc
        except Exception:
            filepath.unlink(missing_ok=True)
            raise

    @staticmethod
    def _get_s3_client():
        try:
            import boto3
        except ImportError as exc:
            raise CommandError('boto3 is required for S3 backups; install the declared runtime dependency.') from exc

        region = os.getenv('AWS_REGION') or os.getenv('AWS_DEFAULT_REGION')
        if not region:
            raise CommandError('AWS_REGION must identify the backup bucket region.')
        return boto3.client('s3', region_name=region)

    def _delete_expired_s3_backups(self, client, bucket, prefix, retention_days):
        cutoff = timezone.now() - datetime.timedelta(days=retention_days)
        versioning = client.get_bucket_versioning(Bucket=bucket).get('Status')
        expired = []

        if versioning in ('Enabled', 'Suspended'):
            paginator = client.get_paginator('list_object_versions')
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for item in page.get('Versions', []) + page.get('DeleteMarkers', []):
                    if item.get('LastModified') and item['LastModified'] < cutoff:
                        expired.append({'Key': item['Key'], 'VersionId': item['VersionId']})
        else:
            paginator = client.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for item in page.get('Contents', []):
                    if item.get('LastModified') and item['LastModified'] < cutoff:
                        expired.append({'Key': item['Key']})

        for offset in range(0, len(expired), 1000):
            response = client.delete_objects(
                Bucket=bucket,
                Delete={'Objects': expired[offset:offset + 1000], 'Quiet': True},
            )
            if response.get('Errors'):
                raise CommandError('S3 reported one or more errors while expiring old backup objects.')

        if expired:
            logger.info('Expired %s backup object/version(s) from the configured S3 prefix.', len(expired))

    @staticmethod
    def _delete_expired_local_backups(backup_dir: Path, retention_days: int):
        cutoff = timezone.now() - datetime.timedelta(days=retention_days)
        for path in backup_dir.glob('tickflow_backup_*.sql.gz'):
            modified = datetime.datetime.fromtimestamp(path.stat().st_mtime, tz=datetime.timezone.utc)
            if modified < cutoff:
                path.unlink()
                logger.info('Expired one local database backup file.')
