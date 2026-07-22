"""
Management command to generate API keys for Tickflow Sentiment.

Supports:
- Creating keys for specific users
- Setting expiry dates
- Multiple key names per user
- Secure key generation with hashing
- Audit logging
"""

import sys
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from authentication.models import UserAPIKey
from authentication.models import AuditLog

User = get_user_model()


class Command(BaseCommand):
    """
    Generate a new API key for a user.
    
    Usage:
        python manage.py generate_apikey <username> --name="My Key" [--expires-days=30]
    
    Example:
        python manage.py generate_apikey admin --name="Production Frontend" --expires-days=365
    """
    
    help = 'Generate a new API key for a user'
    
    # Constants
    MAX_KEYS_PER_USER = 5
    MAX_NAME_LENGTH = 100
    
    def add_arguments(self, parser):
        """
        Add command-line arguments.
        """
        # Positional argument: username
        parser.add_argument(
            'username',
            type=str,
            help='Username of the user to generate the key for'
        )
        
        # Named argument: name
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='Human-readable name for the key (e.g., "Production Frontend")'
        )
        
        # Named argument: expires-days
        parser.add_argument(
            '--expires-days',
            type=int,
            default=None,
            help='Number of days until the key expires (default: never)'
        )
        
        # Named argument: force
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if user has reached max keys limit'
        )
        
        # Named argument: output-format
        parser.add_argument(
            '--output-format',
            choices=['text', 'json', 'env'],
            default='text',
            help='Output format for the key'
        )
        
        # Named argument: quiet
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress non-essential output'
        )

    def handle(self, *args, **options):
        """
        Execute the command.
        """
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
            self._validate_key_name(name)
            
            # 3. Check key limit
            if not force:
                self._check_key_limit(user)
            
            # 4. Create the key
            with transaction.atomic():
                key_obj, raw_key = self._create_key(user, name, expires_days)
                
                # 5. Audit log
                AuditLog.objects.create(
                    user=user,
                    action='API_KEY_CREATED_ADMIN',
                    details={
                        'name': name,
                        'key_id': key_obj.id,
                        'expires_days': expires_days,
                        'generated_by': 'management_command',
                    }
                )
            
            # 6. Display the key
            self._display_key(raw_key, key_obj, output_format, quiet)
            
        except CommandError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error: {e}')
            )
            sys.exit(1)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Unexpected error: {e}')
            )
            self.stdout.write(self.style.ERROR('Please check the logs for more details.'))
            raise

    # ========================================================================
    # VALIDATION METHODS
    # ========================================================================
    
    def _get_user(self, username):
        """Get user by username or email."""
        try:
            # Try username first
            return User.objects.get(username=username)
        except User.DoesNotExist:
            try:
                # Try email
                return User.objects.get(email=username)
            except User.DoesNotExist:
                raise CommandError(f"User '{username}' not found.")
    
    def _validate_key_name(self, name):
        """Validate key name."""
        if not name or not name.strip():
            raise CommandError("Key name is required.")
        
        name = name.strip()
        
        if len(name) > self.MAX_NAME_LENGTH:
            raise CommandError(
                f"Key name must be {self.MAX_NAME_LENGTH} characters or less."
            )
        
        # Check for disallowed characters (optional)
        # Allow letters, numbers, spaces, hyphens, underscores, parentheses
        import re
        if not re.match(r'^[a-zA-Z0-9\s\-_()]+$', name):
            raise CommandError(
                "Key name contains invalid characters. Use letters, numbers, spaces, hyphens, underscores, or parentheses."
            )
        
        return name
    
    def _check_key_limit(self, user):
        """Check if user has reached the maximum number of keys."""
        active_keys = UserAPIKey.objects.filter(
            user=user,
            is_active=True
        ).count()
        
        if active_keys >= self.MAX_KEYS_PER_USER:
            raise CommandError(
                f"User '{user.username}' already has {active_keys} active keys. "
                f"Maximum is {self.MAX_KEYS_PER_USER}. "
                f"Use --force to override or revoke existing keys."
            )
        
        return active_keys

    # ========================================================================
    # KEY CREATION
    # ========================================================================
    
    def _create_key(self, user, name, expires_days):
        """
        Create and store the API key.
        
        Returns:
            tuple: (UserAPIKey object, raw_key string)
        """
        # Check if a key with this name already exists
        existing = UserAPIKey.objects.filter(
            user=user,
            name=name
        ).first()
        
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
            
            existing.is_active = True
            existing.expires_at = self._calculate_expiry(expires_days)
            existing.save()
            
            # Regenerate raw key
            raw_key = UserAPIKey.generate_raw_key()
            existing.key_hash = self._hash_key(raw_key)
            existing.save()
            
            return existing, raw_key
        
        # Create new key
        expires_at = self._calculate_expiry(expires_days)
        key_obj, raw_key = UserAPIKey.create_key(user, name, expires_at)
        
        return key_obj, raw_key
    
    def _calculate_expiry(self, expires_days):
        """Calculate expiry date from days."""
        if expires_days is None:
            return None
        return timezone.now() + timedelta(days=expires_days)
    
    def _hash_key(self, raw_key):
        """Hash the raw key."""
        from django.contrib.auth.hashers import make_password
        return make_password(raw_key)

    # ========================================================================
    # OUTPUT METHODS
    # ========================================================================
    
    def _display_key(self, raw_key, key_obj, output_format, quiet):
        """Display the generated key in the specified format."""
        
        if output_format == 'json':
            import json
            data = {
                'key': raw_key,
                'id': key_obj.id,
                'name': key_obj.name,
                'user': key_obj.user.username,
                'created_at': key_obj.created_at.isoformat(),
                'expires_at': key_obj.expires_at.isoformat() if key_obj.expires_at else None,
            }
            self.stdout.write(json.dumps(data, indent=2))
            
        elif output_format == 'env':
            # For environment variables
            self.stdout.write(f"API_KEY={raw_key}")
            self.stdout.write(f"API_KEY_ID={key_obj.id}")
            
        else:
            # Text format (default)
            if not quiet:
                self.stdout.write('')
                self.stdout.write('=' * 60)
                self.stdout.write(self.style.SUCCESS('✅ API Key Generated Successfully'))
                self.stdout.write('=' * 60)
                self.stdout.write('')
                self.stdout.write(f"📝 Name:        {key_obj.name}")
                self.stdout.write(f"👤 User:        {key_obj.user.username}")
                self.stdout.write(f"📅 Created:     {key_obj.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
                if key_obj.expires_at:
                    self.stdout.write(f"⏰ Expires:     {key_obj.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
                else:
                    self.stdout.write(f"⏰ Expires:     Never")
                self.stdout.write('')
                self.stdout.write('=' * 60)
                self.stdout.write('')
                
                self.stdout.write(self.style.WARNING('⚠️  IMPORTANT:'))
                self.stdout.write(self.style.WARNING('   - Save this key now. It will not be shown again.'))
                self.stdout.write(self.style.WARNING('   - Store it securely like a password.'))
                self.stdout.write(self.style.WARNING('   - Use it in the X-API-Key header.'))
                self.stdout.write('')
            
            # Always show the key (but with warning)
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
                self.stdout.write('   curl -H "X-API-Key: YOUR_KEY" https://api.example.com/v1/endpoint')
                self.stdout.write('')
                self.stdout.write(self.style.WARNING('⚠️  Store this key securely and never commit it to version control.'))
    
    def _confirm(self, prompt):
        """Ask for user confirmation."""
        response = input(prompt).strip().lower()
        return response in ('y', 'yes')