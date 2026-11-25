# Hand-written for GAP-03 (versioned Terms acceptance). Not yet applied to any database.

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('authentication', '0012_userpreferences_weekly_digest'),
    ]

    operations = [
        migrations.CreateModel(
            name='TermsAcceptance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.CharField(max_length=32)),
                ('content_hash', models.CharField(max_length=64)),
                ('accepted_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                           related_name='terms_acceptances', to=settings.AUTH_USER_MODEL)),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name='termsacceptance',
            constraint=models.UniqueConstraint(fields=('user', 'version'), name='uniq_terms_acceptance_user_version'),
        ),
        migrations.CreateModel(
            name='PrivacyNoticeAcknowledgement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.CharField(max_length=32)),
                ('content_hash', models.CharField(max_length=64)),
                ('acknowledged_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                           related_name='privacy_acknowledgements', to=settings.AUTH_USER_MODEL)),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name='privacynoticeacknowledgement',
            constraint=models.UniqueConstraint(fields=('user', 'version'), name='uniq_privacy_ack_user_version'),
        ),
    ]
