# news/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import ProcessedNews, SymbolSearchCache

@admin.register(ProcessedNews)
class ProcessedNewsAdmin(admin.ModelAdmin):
    list_display = (
        "symbol",
        "truncated_title",
        "sentiment_with_color",
        "confidence_bar",
        "provider",        
        "source_name",     
        "published_at",
        "is_recent_flag",
    )

    list_filter = (
        "symbol",
        "sentiment",
        "provider",        
        "published_at",
    )

    search_fields = (
        "title",
        "summary",
        "symbol",
        "source_name",
    )

    date_hierarchy = "published_at"

    readonly_fields = (
        "title_hash",
        "created_at",
        "updated_at",
    )

    list_per_page = 50
    list_select_related = False  # JSONField etc. so keep False unless you have FK joins

    fieldsets = (
        (None, {
            "fields": (
                "symbol",
                "title",
                "summary",
                "url",
                "provider",     
                "source_name",
            )
        }),
        ("Sentiment Analysis", {
            "fields": (
                "sentiment",
                "confidence",
                "sentiment_score",
            )
        }),
        ("Metadata", {
            "fields": (
                "published_at",
                "title_hash",
                "created_at",
                "updated_at",
            )
        }),
        ("Raw Data", {
            "fields": ("raw_data",),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Title")
    def truncated_title(self, obj):
        return obj.title[:75] + "..." if obj.title and len(obj.title) > 75 else obj.title

    @admin.display(description="Sentiment", ordering="sentiment")
    def sentiment_with_color(self, obj):
        color = {"positive": "green", "negative": "red", "neutral": "gray"}.get(obj.sentiment, "gray")
        label = dict(ProcessedNews.SENTIMENT_CHOICES).get(obj.sentiment, obj.sentiment)
        return format_html('<span style="color: {};">{}</span>', color, label)

    @admin.display(description="Confidence", ordering="confidence")
    def confidence_bar(self, obj):
        v = float(obj.confidence or 0.0)
        percent_str = f"{v:.0%}"
        return format_html(
            '<progress value="{}" max="1" style="width: 100px;"></progress> {}',
            v,
            percent_str
        )

    @admin.display(boolean=True, description="Recent?", ordering="published_at")
    def is_recent_flag(self, obj):
        return obj.is_recent


@admin.register(SymbolSearchCache)
class SymbolSearchCacheAdmin(admin.ModelAdmin):
    list_display = ("query", "results_count", "created_at", "expires_at", "is_valid_flag")
    list_filter = ("created_at", "expires_at")
    search_fields = ("query",)
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"

    @admin.display(description="# Results")
    def results_count(self, obj):
        return len(obj.results or [])

    @admin.display(boolean=True, description="Valid?", ordering="expires_at")
    def is_valid_flag(self, obj):
        return obj.is_valid