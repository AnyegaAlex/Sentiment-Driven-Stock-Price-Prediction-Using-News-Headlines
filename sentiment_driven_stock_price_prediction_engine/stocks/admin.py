from django.contrib import admin
from .models import Stock  # Changed from StockData to Stock

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'name', 'created_at')
    search_fields = ('symbol', 'name')