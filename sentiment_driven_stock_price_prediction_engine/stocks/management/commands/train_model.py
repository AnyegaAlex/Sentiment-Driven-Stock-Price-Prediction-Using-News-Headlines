from django.core.management.base import BaseCommand
from stocks.models import Stock
from news.models import NewsArticle
from stocks.ml_model import prepare_dataset, train_model

class Command(BaseCommand):
    help = "Train the stock price prediction model"

    def handle(self, *args, **kwargs):
        # Fetch data from the database
        stock_data = StockData.objects.all()
        news_data = NewsArticle.objects.all()

        # Prepare dataset
        X, y = prepare_dataset(stock_data, news_data)

        # Train the model and get metrics
        metrics = train_model(X, y)

        # Display metrics
        self.stdout.write(self.style.SUCCESS(f"Model trained successfully!"))
        self.stdout.write(f"Accuracy: {metrics['accuracy']}")
        self.stdout.write(f"Precision: {metrics['precision']}")
        self.stdout.write(f"Recall: {metrics['recall']}")
        self.stdout.write(f"F1 Score: {metrics['f1_score']}")
