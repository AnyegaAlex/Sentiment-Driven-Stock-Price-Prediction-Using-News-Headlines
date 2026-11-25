import gzip
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.utils import timezone

from scripts.backup_db import Command


POSTGRES_SETTINGS = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'tickflow',
        'USER': 'tickflow_user',
        'PASSWORD': 'test-db-password',
        'HOST': 'ep-example.ap-southeast-1.aws.neon.tech',
        'PORT': '5432',
        'OPTIONS': {'sslmode': 'require'},
    }
}


def _fake_pg_dump(captured):
    def run(command, stdout, stderr, env, check):
        captured['command'] = command
        captured['env'] = env
        stdout.write(b'-- PostgreSQL database dump\\nSELECT 1;\\n')
        return SimpleNamespace(returncode=0)
    return run


@pytest.mark.django_db
def test_local_backup_uses_configured_database_host_and_is_gzipped(tmp_path):
    captured = {}
    with override_settings(BASE_DIR=tmp_path, DATABASES=POSTGRES_SETTINGS):
        with patch('scripts.backup_db.subprocess.run', side_effect=_fake_pg_dump(captured)):
            call_command('backup_db', '--local')

    backups = list((tmp_path / 'backups').glob('tickflow_backup_*.sql.gz'))
    assert len(backups) == 1
    with gzip.open(backups[0], 'rb') as backup:
        assert b'PostgreSQL database dump' in backup.read()
    command = captured['command']
    assert command[command.index('--host') + 1] == POSTGRES_SETTINGS['default']['HOST']
    assert command[command.index('--port') + 1] == '5432'
    assert captured['env']['PGPASSWORD'] == 'test-db-password'
    assert captured['env']['PGSSLMODE'] == 'require'


@pytest.mark.django_db
def test_cloud_backup_uploads_and_deletes_expired_s3_versions(tmp_path):
    now = timezone.now()
    cutoff = now - timedelta(days=30)

    class Paginator:
        def paginate(self, **kwargs):
            return [{
                'Versions': [
                    {'Key': 'backups/old.sql.gz', 'VersionId': 'old-v1', 'LastModified': cutoff - timedelta(hours=1)},
                    {'Key': 'backups/new.sql.gz', 'VersionId': 'new-v1', 'LastModified': now},
                ],
                'DeleteMarkers': [],
            }]

    class FakeS3:
        def __init__(self):
            self.uploads = []
            self.deletions = []
        def upload_file(self, path, bucket, key, ExtraArgs=None):
            self.uploads.append((path, bucket, key, ExtraArgs))
        def get_bucket_versioning(self, **kwargs):
            return {'Status': 'Enabled'}
        def get_paginator(self, name):
            assert name == 'list_object_versions'
            return Paginator()
        def delete_objects(self, **kwargs):
            self.deletions.append(kwargs)
            return {'Deleted': kwargs['Delete']['Objects']}

    fake_s3 = FakeS3()
    captured = {}
    with override_settings(BASE_DIR=tmp_path, DATABASES=POSTGRES_SETTINGS):
        with patch('scripts.backup_db.subprocess.run', side_effect=_fake_pg_dump(captured)):
            with patch.object(Command, '_get_s3_client', return_value=fake_s3):
                with patch.dict('os.environ', {
                    'BACKUP_S3_BUCKET': 'tickflow-private-backups',
                    'BACKUP_S3_PREFIX': 'backups/',
                    'BACKUP_RETENTION_DAYS': '30',
                }, clear=False):
                    call_command('backup_db')

    assert len(fake_s3.uploads) == 1
    assert fake_s3.uploads[0][1] == 'tickflow-private-backups'
    assert fake_s3.uploads[0][2].startswith('backups/tickflow_backup_')
    assert fake_s3.uploads[0][3] == {'ServerSideEncryption': 'AES256'}
    assert fake_s3.deletions[0]['Delete']['Objects'] == [
        {'Key': 'backups/old.sql.gz', 'VersionId': 'old-v1'}
    ]


@pytest.mark.django_db
def test_backup_prefers_direct_backup_database_url(tmp_path):
    captured = {}
    direct_url = 'postgresql://backup_user:backup_password@ep-example.ap-southeast-1.aws.neon.tech/tickflow?sslmode=require'
    with override_settings(BASE_DIR=tmp_path, DATABASES=POSTGRES_SETTINGS):
        with patch('scripts.backup_db.subprocess.run', side_effect=_fake_pg_dump(captured)):
            with patch.dict('os.environ', {'BACKUP_DATABASE_URL': direct_url}, clear=False):
                call_command('backup_db', '--local')

    command = captured['command']
    assert command[command.index('--host') + 1] == 'ep-example.ap-southeast-1.aws.neon.tech'
    assert command[command.index('--username') + 1] == 'backup_user'
    assert captured['env']['PGPASSWORD'] == 'backup_password'


@pytest.mark.django_db
def test_backup_rejects_neon_pooler_connection(tmp_path):
    pooled = {
        'default': {
            **POSTGRES_SETTINGS['default'],
            'HOST': 'ep-example-pooler.ap-southeast-1.aws.neon.tech',
        }
    }
    with override_settings(BASE_DIR=tmp_path, DATABASES=pooled):
        with patch('scripts.backup_db.subprocess.run') as run:
            with pytest.raises(CommandError, match='pooled'):
                call_command('backup_db', '--local')
            run.assert_not_called()


@pytest.mark.django_db
def test_cloud_backup_requires_bucket_before_running_pg_dump(tmp_path):
    with override_settings(BASE_DIR=tmp_path, DATABASES=POSTGRES_SETTINGS):
        with patch('scripts.backup_db.subprocess.run') as run:
            with patch.dict('os.environ', {'BACKUP_S3_BUCKET': ''}, clear=False):
                with pytest.raises(CommandError, match='BACKUP_S3_BUCKET'):
                    call_command('backup_db')
            run.assert_not_called()


@pytest.mark.django_db
def test_backup_rejects_non_postgresql_database(tmp_path):
    with override_settings(BASE_DIR=tmp_path, DATABASES={
        'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': str(tmp_path / 'db.sqlite3')}
    }):
        with pytest.raises(CommandError, match='require PostgreSQL'):
            call_command('backup_db', '--local')
