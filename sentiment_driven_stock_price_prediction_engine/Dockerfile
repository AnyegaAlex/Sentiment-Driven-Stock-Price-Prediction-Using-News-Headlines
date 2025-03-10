# Use the official Python 3.10 slim image
FROM python:3.10-slim
# Suppress pip's root user warning by setting an environment variable
ENV PIP_ROOT_USER_ACTION=ignore
# Set the working directory in the container
WORKDIR /app
# Copy only the requirements file first for caching dependencies
COPY requirements.txt requirements.txt
# Install dependencies in the container
RUN pip install --no-cache-dir -r requirements.txt
# Download the spaCy language model
RUN python -m spacy download en_core_web_sm
# Copy the rest of the application code
COPY . .
# Command to run the application using Gunicorn
CMD ["gunicorn", "sentiment_driven_stock_price_prediction_engine.wsgi:application", "--bind", "0.0.0.0:8000"]
