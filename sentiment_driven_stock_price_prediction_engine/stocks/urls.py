from django.urls import path
from .views import StockListView
from .views import historical_stock_data, sentiment_stock_data, predict_stock_movement

urlpatterns = [
    path('<str:symbol>/', StockListView.as_view(), name='stock-data'),
     path('api/stocks/historical/', historical_stock_data, name='historical-stock-data'),
    path('api/stocks/sentiment/', sentiment_stock_data, name='sentiment-stock-data'),

]
