from django.contrib import admin
from .models import StockOpinion

@admin.register(StockOpinion)
class StockOpinionAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'action', 'timestamp')
    search_fields = ('symbol', 'action')
