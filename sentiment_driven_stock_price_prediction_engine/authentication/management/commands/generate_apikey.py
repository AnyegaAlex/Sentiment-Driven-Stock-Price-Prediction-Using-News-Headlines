"""
Management command to generate API keys for Tickflow Intelligence.

Supports:
- Creating keys for specific users
- Setting expiry dates
- Multiple key names per user
- Secure key generation with SHA-256 hashing (matches API middleware)
- Transactional audit logging

Usage:
    python manage.py generate_apikey <username> --name="My Key" [--expires-days=30]
"""

from __future__ import annotations  # 👈 FIX: Enables PEP 563 — all type hints become strings

import sys
import re
import hashlib
import json
import logging
from datetime import timedelta
from typing import Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from authentication.models import UserAPIKey, AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Generate a new API key for a user.

    Example:
        python manage.py generate_apikey admin --name="Production Frontend" --expires-days=365
    """

    help = 'Generate a new API key for a user'

    # Constants
    MAX_KEYS_PER_USER = 5
    MAX_NAME_LENGTH = 100

    # ------------------------------------------------------------------------
    # CLI Arguments
    # ------------------------------------------------------------------------

    def add_arguments(self, parser):
        """Add command-line arguments."""
        parser.add_argument(
            'username',
            type=str,
            help='Username or email of the user to generate the key for',
        )
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='Human-readable name for the key (e.g., "Production Frontend")',
        )
        parser.add_argument(
            '--expires-days',
            type=int,
            default=None,
            help='Number of days until the key expires (default: never)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if user has reached max keys limit',
        )
        parser.add_argument(
            '--output-format',
            choices=['text', 'json', 'env'],
            default='text',
            help='Output format for the key',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress non-essential output',
        )

    # ------------------------------------------------------------------------
    # Main Handler
    # ------------------------------------------------------------------------

    def handle(self, *args, **options):
        """Execute the command."""
        username = options['username']
        name = options['name']
        expires_days = options.get('expires_days')
        force = options.get('force', False)
        output_format = options.get('output_format', 'text')
        quiet = options.get('quiet', False)

        try:
            # 1. Validate user
            user = self._get_user(username)

            # 2. Validate key name
            name = self._validate_key_name(name)

            # 3. Check key limit (unless --force)
            if not force:
                self._check_key_limit(user)

            # 4. Create or reactivate the key inside a transaction
            with transaction.atomic():
                key_obj, raw_key, is_reactivation = self._create_key(
                    user, name, expires_days
                )

                # 5. Audit log (inside the transaction)
                AuditLog.objects.create(
                    user=user,
                    action='API_KEY_REACTIVATED' if is_reactivation else 'API_KEY_CREATED',
                    details={
                        'name': name,
                        'key_id': key_obj.id,
                        'expires_days': expires_days,
                        'generated_by': 'management_command',
                    },
                )

                logger.info(
                    f"API Key {'reactivated' if is_reactivation else 'created'} "
                    f"via CLI for user {user.username} (ID: {user.id})"
                )

            # 6. Display the key (once only — never stored in plaintext)
            self._display_key(raw_key, key_obj, output_format, quiet)

        except CommandError as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
            sys.exit(1)
        except Exception as e:
            logger.exception(f"Unexpected error in generate_apikey command: {e}")
            self.stdout.write(self.style.ERROR(f'❌ Unexpected error: {e}'))
            self.stdout.write(
                self.style.ERROR('Please check the logs for more details.')
            )
            raise

    # ------------------------------------------------------------------------
    # Validation Methods
    # ------------------------------------------------------------------------

    def _get_user(self, username: str) -> User:
        """Get user by username or email."""
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            try:
                return User.objects.get(email=username)
            except User.DoesNotExist:
                raise CommandError(f"User '{username}' not found.")

    def _validate_key_name(self, name: str) -> str:
        """Validate key name."""
        if not name or not name.strip():
            raise CommandError("Key name is required.")

        name = name.strip()
        if len(name) > self.MAX_NAME_LENGTH:
            raise CommandError(
                f"Key name must be {self.MAX_NAME_LENGTH} characters or less."
            )

        # Allow letters, numbers, spaces, hyphens, underscores, parentheses
        if not re.match(r'^[a-zA-Z0-9\s\-_()]+$', name):
            raise CommandError(
                "Key name contains invalid characters. Use letters, numbers, "
                "spaces, hyphens, underscores, or parentheses."
            )
        return name

    def _check_key_limit(self, user: User) -> int:
        """Check if user has reached the maximum number of active keys."""
        active_keys = UserAPIKey.objects.filter(user=user, is_active=True).count()

        if active_keys >= self.MAX_KEYS_PER_USER:
            raise CommandError(
                f"User '{user.username}' already has {active_keys} active keys. "
                f"Maximum is {self.MAX_KEYS_PER_USER}. "
                f"Use --force to override or revoke existing keys."
            )
        return active_keys

    # ------------------------------------------------------------------------
    # Key Creation & Hashing
    # ------------------------------------------------------------------------

    def _create_key(
        self,
        user: User,
        name: str,
        expires_days: Optional[int],
    ) -> Tuple[UserAPIKey, str, bool]:
        """
        Create and store the API key.

        Returns:
            Tuple: (UserAPIKey object, raw_key string, is_reactivation bool)
        """
        existing = UserAPIKey.objects.filter(user=user, name=name).first()

        if existing and existing.is_active:
            raise CommandError(
                f"Key with name '{name}' already exists for user '{user.username}'. "
                "Please choose a different name."
            )

        elif existing and not existing.is_active:
            # Reactivate existing key
            if not self._confirm(
                f"Key '{name}' exists but is deactivated. Reactivate it? (y/N): "
            ):
                raise CommandError("Key creation cancelled.")

            raw_key = UserAPIKey.generate_raw_key()

            # ✅ FIX: Use SHA-256 (matches authentication.py validator)
            existing.is_active = True
            existing.expires_at = self._calculate_expiry(expires_days)
            existing.key_hash = self._hash_key(raw_key)
            existing.save(update_fields=['is_active', 'expires_at', 'key_hash'])

            return existing, raw_key, True

        # Create new key (delegate to model manager for consistency)
        expires_at = self._calculate_expiry(expires_days)
        key_obj, raw_key = UserAPIKey.create_key(user, name, expires_at)

        return key_obj, raw_key, False

    def _calculate_expiry(self, expires_days: Optional[int]) -> Optional[object]:
        """Calculate expiry date from days."""
        if expires_days is None:
            return None
        return timezone.now() + timedelta(days=expires_days)

    def _hash_key(self, raw_key: str) -> str:
        """
        Hash the raw key using SHA-256.
        MUST match the hashing algorithm used in authentication/authentication.py.
        """
        return hashlib.sha256(raw_key.encode()).hexdigest()

    # ------------------------------------------------------------------------
    # Output Methods
    # ------------------------------------------------------------------------

    def _display_key(
        self,
        raw_key: str,
        key_obj: UserAPIKey,
        output_format: str,
        quiet: bool,
    ) -> None:
        """Display the generated key in the specified format."""

        if output_format == 'json':
            data = {
                'key': raw_key,
                'id': key_obj.id,
                'name': key_obj.name,
                'user': key_obj.user.username,
                'created_at': key_obj.created_at.isoformat(),
                'expires_at': (
                    key_obj.expires_at.isoformat() if key_obj.expires_at else None
                ),
            }
            self.stdout.write(json.dumps(data, indent=2))

        elif output_format == 'env':
            self.stdout.write(f"API_KEY={raw_key}")
            self.stdout.write(f"API_KEY_ID={key_obj.id}")

        else:
            # Text format (default)
            if not quiet:
                self.stdout.write('')
                self.stdout.write('=' * 60)
                self.stdout.write(
                    self.style.SUCCESS('✅ API Key Generated Successfully')
                )
                self.stdout.write('=' * 60)
                self.stdout.write('')
                self.stdout.write(f"📝 Name:        {key_obj.name}")
                self.stdout.write(f"👤 User:        {key_obj.user.username}")
                self.stdout.write(
                    f"📅 Created:     {key_obj.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}"
                )
                if key_obj.expires_at:
                    self.stdout.write(
                        f"⏰ Expires:     {key_obj.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}"
                    )
                else:
                    self.stdout.write(f"⏰ Expires:     Never")
                self.stdout.write('')
                self.stdout.write('=' * 60)
                self.stdout.write('')

                self.stdout.write(self.style.WARNING('⚠️  IMPORTANT:'))
                self.stdout.write(
                    self.style.WARNING(
                        '   - Save this key now. It will not be shown again.'
                    )
                )
                self.stdout.write(
                    self.style.WARNING('   - Store it securely like a password.')
                )
                self.stdout.write(
                    self.style.WARNING('   - Use it in the X-API-Key header.')
                )
                self.stdout.write('')

            # Always show the key (with warning)
            self.stdout.write('=' * 60)
            self.stdout.write(self.style.SUCCESS('🔑 API KEY:'))
            self.stdout.write(self.style.WARNING('=' * 60))
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(raw_key))
            self.stdout.write('')
            self.stdout.write('=' * 60)
            self.stdout.write('')

            if not quiet:
                self.stdout.write(self.style.SUCCESS('📋 Usage:'))
                self.stdout.write(
                    '   curl -H "X-API-Key: YOUR_KEY" https://api.example.com/v1/endpoint'
                )
                self.stdout.write('')
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️  Store this key securely and never commit it to version control.'
                    )
                )

    def _confirm(self, prompt: str) -> bool:
        """Ask for user confirmation."""
        response = input(prompt).strip().lower()
        return response in ('y', 'yes')