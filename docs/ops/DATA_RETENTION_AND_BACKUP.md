# Data retention and backup operations

This document describes the commands and intended schedules. It is not evidence that a production Render Cron Job is configured; that must be verified in the Render dashboard.

## Account and audit retention

The recommended daily scheduled entry point is:

~~~sh
python manage.py run_daily_maintenance
~~~

It runs retention and backup independently, then exits non-zero if either fails. This allows one scheduled service to cover both jobs.

Recommended schedule: daily at 02:15 East Africa Time (23:15 UTC), after confirming the Render Cron Job plan and service configuration. Render bills Cron Jobs by active runtime (the smallest plan starts at $0.00016/minute), with a minimum $1/month per Cron Job service. One combined job keeps the minimum to one service; no billable service should be created without approval. See https://render.com/docs/cronjobs.

For a non-destructive preview:

~~~sh
python manage.py run_retention_maintenance --dry-run
~~~

## Database backups

Run daily:

~~~sh
python manage.py backup_db
~~~

The command:
- uses BACKUP_DATABASE_URL when configured, otherwise the active Django PostgreSQL connection; for Neon, configure the direct non-pooler endpoint because pg_dump should not use the transaction pooler;
- writes a real gzip-compressed SQL dump;
- uploads it to the configured private S3 bucket;
- removes local backup files and S3 objects/versions older than BACKUP_RETENTION_DAYS (30 days by default);
- fails if the upload or expiry operation fails, rather than reporting a successful cloud backup.

Required environment configuration:
- BACKUP_DATABASE_URL (recommended for Neon: direct, non-pooler PostgreSQL connection string used only by pg_dump; do not put this value in source control)
- BACKUP_S3_BUCKET
- BACKUP_S3_PREFIX (defaults to backups/)
- BACKUP_RETENTION_DAYS (defaults to 30)
- BACKUP_S3_SERVER_SIDE_ENCRYPTION (defaults to AES256; use aws:kms only with a KMS key)
- BACKUP_S3_KMS_KEY_ID (required only when using aws:kms)
- AWS_REGION
- AWS credentials supplied through the runtime credential environment

The runtime image must contain pg_dump and the Python environment must contain boto3.

When running the combined daily command, the backup follows retention automatically. If separate schedules are preferred, run the backup at 03:15 East Africa Time (00:15 UTC).

## S3 permissions

Use a dedicated IAM identity restricted to the backup bucket and prefix. The runtime needs `s3:PutObject`, `s3:ListBucket`, `s3:ListBucketVersions`, `s3:DeleteObject` and `s3:DeleteObjectVersion` for the configured prefix. Add multipart-upload permissions if the backup size requires them. A separate restore operator needs `s3:GetObject`. If SSE-KMS is selected, grant only the required KMS encrypt/data-key permissions on the specific key. Do not use account-wide S3 administrator credentials.

## Production verification checklist

Before publishing a retention promise, verify:
- the combined Render Cron Job exists, is enabled and targets the production environment;
- the schedules and time zone are correct;
- the last successful run and failure alerts are visible;
- the S3 bucket is private; uploads explicitly request server-side encryption; verify bucket policy and encryption configuration;
- bucket versioning and lifecycle settings are understood;
- an actual restore test has been completed;
- the S3 bucket region and access policy are documented.

A configured script or a committed schedule document is not proof of a production schedule or a successful restore.
