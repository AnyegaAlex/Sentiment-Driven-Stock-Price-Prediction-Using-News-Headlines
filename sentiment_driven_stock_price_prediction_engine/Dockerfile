# Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "sentiment_driven_stock_price_prediction_engine.wsgi:application", "--bind", "0.0.0.0:8000"]
