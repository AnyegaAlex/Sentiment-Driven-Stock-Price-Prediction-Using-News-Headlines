# sentiment_driven_stock_price_prediction_engine/news/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import ProcessedNews, SymbolSearchCache

@admin.register(ProcessedNews)
class ProcessedNewsAdmin(admin.ModelAdmin):
    list_display = (
        'symbol',
        'truncated_title',
        'sentiment_with_color',
        'confidence_bar',
        'source',
        'published_at',
        'is_recent'
    )
    list_filter = (
        'symbol',
        'sentiment',
        'source',
        'published_at'
    )
    search_fields = (
        'title',
        'summary',
        'symbol'
    )
    date_hierarchy = 'published_at'
    readonly_fields = (
        'title_hash',
        'created_at',
        'updated_at',
        'sentiment_color'
    )
    list_per_page = 50
    list_select_related = True
    fieldsets = (
        (None, {
            'fields': (
                'symbol',
                'title',
                'summary',
                'source'
            )
        }),
        ('Sentiment Analysis', {
            'fields': (
                'sentiment',
                'confidence',
                'sentiment_color'
            )
        }),
        ('Metadata', {
            'fields': (
                'published_at',
                'title_hash',
                'created_at',
                'updated_at'
            )
        }),
        ('Raw Data', {
            'fields': ('raw_data',),
            'classes': ('collapse',)
        })
    )

    def truncated_title(self, obj):
        return obj.title[:75] + '...' if len(obj.title) > 75 else obj.title
    truncated_title.short_description = 'Title'

    def sentiment_with_color(self, obj):
        color = obj.sentiment_color
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_sentiment_display()
        )
    sentiment_with_color.short_description = 'Sentiment'
    sentiment_with_color.admin_order_field = 'sentiment'

    def confidence_bar(self, obj):
        # Convert to float explicitly
        confidence_value = float(obj.confidence)
        # Format the percentage using an f-string, which produces a regular string
        percent_str = f"{confidence_value:.0%}"
        return format_html(
            '<progress value="{}" max="1" style="width: 100px;"></progress> {}',
            confidence_value,
            percent_str
        )
    confidence_bar.short_description = 'Confidence'
    confidence_bar.admin_order_field = 'confidence'

    def is_recent(self, obj):
        return obj.is_recent
    is_recent.boolean = True
    is_recent.short_description = 'Recent?'
    is_recent.admin_order_field = 'published_at'


@admin.register(SymbolSearchCache)
class SymbolSearchCacheAdmin(admin.ModelAdmin):
    list_display = (
        'query',
        'results_count',
        'created_at',
        'expires_at',
        'is_valid'
    )
    list_filter = ('created_at', 'expires_at')
    search_fields = ('query',)
    readonly_fields = ('created_at', 'is_valid')
    date_hierarchy = 'created_at'

    def results_count(self, obj):
        return len(obj.results)
    results_count.short_description = '# Results'

    def is_valid(self, obj):
        return obj.is_valid
    is_valid.boolean = True
    is_valid.short_description = 'Valid?'
    is_valid.admin_order_field = 'expires_at'