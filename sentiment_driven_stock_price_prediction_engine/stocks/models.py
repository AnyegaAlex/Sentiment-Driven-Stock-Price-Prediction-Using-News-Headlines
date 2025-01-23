from django.db import models

class StockData(models.Model):
    symbol = models.CharField(max_length=10)
    date = models.DateField()
    open_price = models.FloatField()
    close_price = models.FloatField()
    sentiment_score = models.FloatField()  # Combined sentiment score

    def __str__(self):
        return f"{self.symbol} - {self.date}"
