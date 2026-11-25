from django.db import migrations, models


def disable_legacy_digest_subscriptions(apps, schema_editor):
    UserPreferences = apps.get_model('authentication', 'UserPreferences')
    UserPreferences.objects.all().update(
        weekly_digest=False,
        weekly_digest_opted_in_at=None,
        weekly_digest_unsubscribed_at=None,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('authentication', '0013_legal_acknowledgements'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreferences',
            name='weekly_digest_opted_in_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When the user most recently opted in to the weekly digest.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='userpreferences',
            name='weekly_digest_unsubscribed_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When the user most recently opted out of the weekly digest.',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='userpreferences',
            name='weekly_digest',
            field=models.BooleanField(
                default=False,
                help_text='Whether to send optional weekly digest emails; requires explicit opt-in.',
            ),
        ),
        migrations.RunPython(disable_legacy_digest_subscriptions, migrations.RunPython.noop),
    ]
