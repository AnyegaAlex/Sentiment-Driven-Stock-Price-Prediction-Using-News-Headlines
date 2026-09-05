# stocks/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db import transaction

from .models import (
    StockOpinion,
    Prediction,
    ModelPerformanceSnapshot,
    Subscription,
)


# ============================================================================
# STOCK OPINION ADMIN
# ============================================================================

@admin.register(StockOpinion)
class StockOpinionAdmin(admin.ModelAdmin):
    list_display = (
        "symbol",
        "action_with_color",
        "horizon",
        "composite_confidence",
        "technical_confidence",
        "sentiment_confidence",
        "timestamp",
    )
    list_filter = ("action", "horizon", "timestamp")
    search_fields = ("symbol", "explanation")
    readonly_fields = ("timestamp",)
    ordering = ("-timestamp",)
    list_per_page = 50

    fieldsets = (
        (None, {
            "fields": ("symbol", "action", "horizon")
        }),
        ("Confidence Scores", {
            "fields": (
                "technical_confidence",
                "sentiment_confidence",
                "composite_confidence",
            )
        }),
        ("Analysis", {
            "fields": ("explanation", "factors", "risk_metrics", "contrarian_warnings")
        }),
        ("Metadata", {
            "fields": (
                "historical_accuracy",
                "news_data",
                "timestamp",
            ),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Action", ordering="action")
    def action_with_color(self, obj):
        color_map = {
            "strong_buy": "green",
            "buy": "lightgreen",
            "hold": "orange",
            "sell": "lightcoral",
            "strong_sell": "red",
        }
        color = color_map.get(obj.action, "gray")
        label = obj.get_action_display()
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, label)


# ============================================================================
# PREDICTION ADMIN
# ============================================================================

@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = (
        "stock_symbol",
        "date",
        "predicted_movement",
        "confidence_percent",
        "is_correct_badge",
        "user",
        "source",
        "created_at",
    )
    list_filter = (
        "stock_symbol",
        "predicted_movement",
        "is_correct",
        "source",
        "date",
        "created_at",
        "user",
    )
    search_fields = (
        "stock_symbol",
        "headline",
        "user__username",
        "user__email",
    )
    readonly_fields = (
        "id",
        "created_at",
        "price_at_prediction",
        "price_at_resolution",
        "resolution_date",
        "time_to_resolution",
        "is_correct",
        "actual_direction",
        "price_change_percent",
    )
    ordering = ("-date",)
    date_hierarchy = "date"
    list_per_page = 50

    fieldsets = (
        ("Prediction Details", {
            "fields": (
                "stock_symbol",
                "date",
                "headline",
                "predicted_movement",
                "confidence",
                "sentiment_score",
                "source",
                "user",
            )
        }),
        ("Accuracy & Resolution", {
            "fields": (
                "is_correct",
                "actual_direction",
                "price_at_prediction",
                "price_at_resolution",
                "price_change_percent",
                "resolution_date",
                "time_to_resolution",
            )
        }),
        ("Explainability (SHAP)", {
            "fields": (
                "shap_values",
                "feature_importance",
                "prediction_explanation",
            ),
            "classes": ("collapse",),
        }),
        ("Market Context", {
            "fields": ("market_context",),
            "classes": ("collapse",),
        }),
        ("Metadata", {
            "fields": ("id", "created_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Confidence", ordering="confidence")
    def confidence_percent(self, obj):
        return f"{obj.confidence * 100:.1f}%"

    @admin.display(description="Correct", boolean=True)
    def is_correct_badge(self, obj):
        return obj.is_correct

    actions = ["recalculate_accuracy"]

    @admin.action(description="Recalculate accuracy for selected predictions")
    def recalculate_accuracy(self, request, queryset):
        from .utils import resolve_prediction
        resolved = 0
        errors = 0
        for pred in queryset.filter(is_correct__isnull=True):
            try:
                with transaction.atomic():  
                    if resolve_prediction(pred):
                        resolved += 1
                    else:
                        errors += 1
            except Exception as e:
                errors += 1
                self.message_user(request, f"Error resolving {pred.id}: {e}", level='ERROR')
        self.message_user(request, f"Resolved {resolved} prediction(s). Errors: {errors}.")


# ============================================================================
# MODEL PERFORMANCE SNAPSHOT ADMIN
# ============================================================================

@admin.register(ModelPerformanceSnapshot)
class ModelPerformanceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "symbol",
        "accuracy_display",
        "f1_score",
        "precision",
        "recall",
        "drift_status",
        "total_predictions",
    )
    list_filter = ("date", "symbol", "drift_detected", "drift_severity")
    search_fields = ("symbol",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "date"
    ordering = ("-date",)

    @admin.display(description="Accuracy", ordering="accuracy")
    def accuracy_display(self, obj):
        return f"{obj.accuracy:.1f}%"

    @admin.display(description="Drift")
    def drift_status(self, obj):
        if not obj.drift_detected:
            return format_html('<span style="color: green;">✓ Stable</span>')
        severity = obj.drift_severity or "low"
        color = {"low": "orange", "medium": "orange", "high": "red"}.get(severity, "gray")
        return format_html('<span style="color: {};">⚠ {} drift</span>', color, severity.capitalize())

    actions = ["mark_drift", "clear_drift"]

    @admin.action(description="Mark selected snapshots as having drift (high)")
    def mark_drift(self, request, queryset):
        updated = queryset.update(drift_detected=True, drift_severity="high")
        self.message_user(request, f"Marked {updated} snapshot(s) with high drift.")

    @admin.action(description="Clear drift flags")
    def clear_drift(self, request, queryset):
        updated = queryset.update(drift_detected=False, drift_severity=None)
        self.message_user(request, f"Cleared drift for {updated} snapshot(s).")


# ============================================================================
# SUBSCRIPTION ADMIN
# ============================================================================

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("email", "subscribed_at", "is_active")
    list_filter = ("is_active", "subscribed_at")
    search_fields = ("email",)
    readonly_fields = ("subscribed_at",)
    ordering = ("-subscribed_at",)

    actions = ["activate_subscriptions", "deactivate_subscriptions"]

    @admin.action(description="Activate selected subscriptions")
    def activate_subscriptions(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"Activated {updated} subscription(s).")

    @admin.action(description="Deactivate selected subscriptions")
    def deactivate_subscriptions(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {updated} subscription(s).")