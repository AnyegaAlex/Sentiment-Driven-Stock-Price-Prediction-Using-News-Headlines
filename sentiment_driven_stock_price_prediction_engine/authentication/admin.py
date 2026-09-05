# authentication/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.utils.safestring import mark_safe

from .models import (
    User,
    UserPreferences,
    UserAPIKey,
    AuditLog,
    SymbolUsage,
    PersonaChoices,
    TierChoices,
)


# ============================================================================
# INLINE FOR USER PREFERENCES
# ============================================================================

class UserPreferencesInline(admin.StackedInline):
    model = UserPreferences
    can_delete = False
    verbose_name_plural = "Preferences"
    fieldsets = (
        (None, {
            "fields": (
                "investment_goal",
                "risk_tolerance",
                "experience_level",
                "watchlist",
            )
        }),
        ("Notifications", {
            "fields": (
                "email_notifications",
                "price_alerts",
                "news_alerts",
                "weekly_digest",
            )
        }),
        ("Appearance", {
            "fields": (
                "theme",
                "language",
                "timezone",
            )
        }),
    )
    readonly_fields = ("created_at", "updated_at")
    extra = 0


# ============================================================================
# USER ADMIN
# ============================================================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "persona_display",
        "tier_display",
        "email_verified",
        "is_active",
        "is_staff",
        "prediction_accuracy_display",
        "date_joined",
    )
    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
        "email_verified",
        "tier",
        "persona",
        "date_joined",
        "onboarded",
    )
    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
        "nickname",
        "bio",
    )
    ordering = ("-date_joined",)
    readonly_fields = (
        "date_joined",
        "last_login",
        "created_at",
        "updated_at",
        "last_username_change",
        "last_email_change",
        "deletion_requested_at",
        "deletion_scheduled_for",
        "analyses_count",
        "predictions_count",
        "news_read_count",
        "prediction_accuracy",
        "api_key",
    )

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Tickflow – Persona & Tier", {
            "fields": (
                "persona",
                "tier",
                "onboarded",
            )
        }),
        ("Verification", {
            "fields": (
                "email_verified",
            )
        }),
        ("Statistics", {
            "fields": (
                "analyses_count",
                "predictions_count",
                "news_read_count",
                "prediction_accuracy",
            )
        }),
        ("Username & Email Changes", {
            "fields": (
                "username_change_year",
                "username_change_count_year",
                "last_username_change",
                "last_email_change",
            ),
            "classes": ("collapse",),
        }),
        ("Account Deletion", {
            "fields": (
                "deletion_requested_at",
                "deletion_scheduled_for",
            ),
            "classes": ("collapse",),
        }),
        ("Legacy API Key (Deprecated)", {
            "fields": ("api_key",),
            "classes": ("collapse",),
        }),
    )

    inlines = [UserPreferencesInline]

    @admin.display(description="Persona", ordering="persona")
    def persona_display(self, obj):
        return dict(PersonaChoices.CHOICES).get(obj.persona, obj.persona or "—")

    @admin.display(description="Tier", ordering="tier")
    def tier_display(self, obj):
        return dict(TierChoices.CHOICES).get(obj.tier, obj.tier)

    @admin.display(description="Accuracy", ordering="prediction_accuracy")
    def prediction_accuracy_display(self, obj):
        acc = float(obj.prediction_accuracy or 0.0)
        color = "green" if acc >= 70 else "orange" if acc >= 50 else "red"
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}%</span>',
            color,
            f"{acc:.1f}"
        )


# ============================================================================
# USER PREFERENCES ADMIN (NOW REGISTERED)
# ============================================================================

@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "theme",
        "language",
        "timezone",
        "weekly_digest",
        "updated_at",
    )
    list_filter = ("theme", "language", "weekly_digest")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("user",)}),
        ("Investment Preferences", {
            "fields": (
                "investment_goal",
                "risk_tolerance",
                "experience_level",
                "watchlist",
            )
        }),
        ("Notifications", {
            "fields": (
                "email_notifications",
                "price_alerts",
                "news_alerts",
                "weekly_digest",
            )
        }),
        ("Appearance", {
            "fields": ("theme", "language", "timezone")
        }),
        ("Metadata", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def has_add_permission(self, request):
        return False  # auto‑created

    def has_delete_permission(self, request, obj=None):
        return False


# ============================================================================
# OTHER ADMIN CLASSES
# ============================================================================

@admin.register(UserAPIKey)
class UserAPIKeyAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "name",
        "key_preview",
        "is_active",
        "created_at",
        "last_used",
        "expires_at_display",
    )
    list_filter = ("is_active", "created_at", "expires_at")
    search_fields = ("user__username", "user__email", "name")
    readonly_fields = (
        "user",
        "name",
        "key_hash",
        "created_at",
        "last_used",
        "is_active",
        "expires_at",
    )
    fieldsets = (
        (None, {
            "fields": (
                "user",
                "name",
                "is_active",
            )
        }),
        ("Key Details", {
            "fields": (
                "key_hash",
                "created_at",
                "last_used",
                "expires_at",
            )
        }),
    )

    @admin.display(description="Key Preview", ordering="key_hash")
    def key_preview(self, obj):
        if obj.key_hash and len(obj.key_hash) >= 8:
            return f"…{obj.key_hash[-8:]}"
        return "—"

    @admin.display(description="Expires", ordering="expires_at")
    def expires_at_display(self, obj):
        if obj.expires_at:
            if obj.expires_at < timezone.now():
                return format_html('<span style="color: red;">Expired</span>')
            else:
                return obj.expires_at.strftime("%Y-%m-%d %H:%M")
        return "Never"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "action",
        "timestamp",
        "ip_address",
        "user_agent_short",
    )
    list_filter = ("action", "timestamp")
    search_fields = (
        "user__username",
        "user__email",
        "action",
        "details",
    )
    readonly_fields = ("user", "action", "details", "timestamp")
    date_hierarchy = "timestamp"
    list_per_page = 50

    def ip_address(self, obj):
        return obj.details.get("ip", "—") if obj.details else "—"
    ip_address.short_description = "IP Address"

    def user_agent_short(self, obj):
        ua = obj.details.get("user_agent", "") if obj.details else ""
        if ua and len(ua) > 30:
            return ua[:30] + "…"
        return ua or "—"
    user_agent_short.short_description = "User Agent"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SymbolUsage)
class SymbolUsageAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "symbol",
        "count",
        "last_updated",
    )
    list_filter = ("symbol", "last_updated")
    search_fields = (
        "user__username",
        "user__email",
        "symbol",
    )
    readonly_fields = ("user", "symbol", "count", "last_updated")
    ordering = ("-count", "-last_updated")
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False