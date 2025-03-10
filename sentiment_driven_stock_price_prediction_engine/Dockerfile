# Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm
COPY . .
CMD ["gunicorn", "sentiment_driven_stock_price_prediction_engine.wsgi:application", "--bind", "0.0.0.0:8000"]
