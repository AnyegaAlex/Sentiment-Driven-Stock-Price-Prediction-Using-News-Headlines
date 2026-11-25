import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from unittest.mock import patch


@pytest.mark.django_db
def test_daily_maintenance_runs_retention_and_backup_independently():
    calls = []

    def fake_call_command(name, **kwargs):
        calls.append(name)
        if name == 'run_retention_maintenance':
            raise RuntimeError('retention failed')

    with patch('authentication.management.commands.run_daily_maintenance.call_command', side_effect=fake_call_command):
        with pytest.raises(CommandError, match='run_retention_maintenance'):
            call_command('run_daily_maintenance')

    assert calls == ['run_retention_maintenance', 'backup_db']
