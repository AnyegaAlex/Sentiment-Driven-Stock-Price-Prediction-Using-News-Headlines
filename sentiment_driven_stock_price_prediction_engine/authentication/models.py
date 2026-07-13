from django.db import models
from django.utils import timezone
import secrets

class APIKey(models.Model):
    key = models.CharField(max_length=64, unique=True, editable=False)
    name = models.CharField(max_length=100, help_text="E.g., 'Production Frontend'")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @classmethod
    def is_valid(cls, key):
        try:
            obj = cls.objects.get(key=key, is_active=True)
            if obj.expires_at and obj.expires_at < timezone.now():
                return False
            return True
        except cls.DoesNotExist:
            return False

    def __str__(self):
        return f"{self.name} - {self.key[:8]}..."