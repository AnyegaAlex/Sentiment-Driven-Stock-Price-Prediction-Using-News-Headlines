# data_ingestion/views.py
from django.shortcuts import render
from .utils import fetch_news, fetch_stock_data, analyze_sentiment

def stock_analysis_view(request):
    # Fetch news and stock data
    news = fetch_news(query="Tesla")
    stock_data = fetch_stock_data(ticker="TSLA", start_date="2023-01-01", end_date="2023-12-31")
    
    # Extract headlines for sentiment analysis
    headlines = [article['title'] for article in news]
    sentiment_results = analyze_sentiment(headlines)
    
    # Pass data to template
    context = {
        "news": news,
        "stock_data": stock_data.to_dict() if stock_data is not None else {},
        "sentiments": sentiment_results,
    }
    return render(request, 'data_ingestion/stock_analysis.html', context)


