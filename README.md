```markdown
# Sentiment-Driven Stock Price Prediction Using News Headlines

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1-brightgreen)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## Live Demo

| Component | URL | Status |
|-----------|-----|--------|
| Frontend (Vercel) | [https://sentiment-driven-stock-price-predic.vercel.app/](https://sentiment-driven-stock-price-predic.vercel.app/) | Live |
| Backend API (Render) | [https://sentiment-driven-stock-price-prediction.onrender.com](https://sentiment-driven-stock-price-prediction.onrender.com/health/) | Live |
| API Documentation (Swagger) | [https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/](https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/) | Live |
| LSTM Model (Gradio) | [https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics](https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics) | Live |

---

## Overview

This project delivers a real-time stock sentiment analysis platform that leverages NLP and machine learning to predict stock price movements based on financial news headlines. The system aggregates news from multiple sources, performs sentiment analysis using FinBERT, and provides an interactive dashboard for market monitoring.

**Key Differentiators:**
- Multi-source news aggregation with intelligent fallback
- Production-grade API with authentication and rate limiting
- Real-time sentiment analysis with confidence scoring
- LSTM-based price movement predictions
- Modern, responsive React dashboard

---

## Screenshots

*Coming soon – add your screenshots here*

| Desktop Dashboard | Mobile View |
|-------------------|-------------|
| ![Dashboard](screenshots/dashboard-desktop.png) | ![Mobile](screenshots/dashboard-mobile.png) |

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Getting an API Key](#getting-an-api-key)
- [Installation](#installation)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Features

### 1. Automated News Aggregation
- Multi-source integration with Alpha Vantage, Yahoo Finance, and Finnhub
- SHA-256 based duplicate detection for unique articles
- Dynamic filtering by date, sentiment, and source reliability
- Intelligent fallback between data sources

### 2. Sentiment and Contextual Analysis
- FinBERT-powered sentiment classification
- Confidence scoring (0 to 1) for each prediction
- Key phrase extraction using spaCy
- Historical sentiment trend visualization

### 3. Interactive Dashboard
- Unified view combining market metrics, news, and predictions
- Interactive charts with sentiment overlays
- Custom filtering and real-time refresh
- Confidence and source reliability indicators

### 4. Infrastructure
- Django REST Framework with API key authentication
- Redis-based caching with memory fallback
- PostgreSQL database with connection pooling
- Dockerized deployment

### 5. Prediction Pipeline
- LSTM neural network for price movement predictions
- Scikit-learn pipeline with TF-IDF and Logistic Regression
- Model persistence with Joblib
- Gradio interface for interactive predictions

---

## Architecture

### Component Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React)"]
        UI[Dashboard UI]
        Cards[Market Metrics Cards]
        News[News List]
        Charts[Prediction Charts]
    end

    subgraph Backend["Backend (Django)"]
        API[REST API]
        Auth[API Key Auth]
        Cache[Redis Cache]
        DB[(PostgreSQL)]
    end

    subgraph ML["ML Pipeline"]
        Model[LSTM Model]
        Gradio[Gradio Interface]
    end

    subgraph External["External APIs"]
        AV[Alpha Vantage]
        FH[Finnhub]
        YH[Yahoo Finance]
    end

    UI --> API
    Cards --> API
    News --> API
    Charts --> API
    API --> Auth
    API --> Cache
    API --> DB
    API --> Model
    API --> AV
    API --> FH
    API --> YH
    Gradio --> Model
```

### API Request Flow

```mermaid
sequenceDiagram
    participant Client as Frontend/API Client
    participant Auth as APIKeyMiddleware
    participant Throttle as RateLimitThrottle
    participant DB as PostgreSQL
    participant Handler as View Handler

    Client->>Auth: Request + X-API-Key header
    Auth->>DB: Query APIKey table
    
    alt Invalid/Missing Key
        DB-->>Auth: Key not found
        Auth-->>Client: 401 Unauthorized
    else Valid Key
        DB-->>Auth: Key exists and active
        Auth->>Throttle: Check rate limit
        Throttle->>DB: Get usage count
        
        alt Under Limit
            DB-->>Throttle: Usage < 200
            Throttle-->>Auth: Allow request
            Auth->>Handler: Forward request
            Handler-->>Client: 200 OK + RateLimit headers
        else Over Limit
            DB-->>Throttle: Usage >= 200
            Throttle-->>Client: 429 Too Many Requests
        end
    end
```

### News Processing Pipeline

```mermaid
flowchart TD
    A[Fetch News Task] --> B{Check Cache}
    B -->|Cache Hit| C[Return Cached Data]
    B -->|Cache Miss| D[Fetch from External APIs]
    
    D --> E[Alpha Vantage]
    D --> F[Finnhub]
    D --> G[Yahoo Finance]
    
    E & F & G --> H[Normalize and Deduplicate]
    H --> I[Sentiment Analysis with FinBERT]
    I --> J[Key Phrase Extraction]
    J --> K[Store in Database]
    K --> L[Return Processed Data]
    
    M[Error Handler] -->|Retry| D
    N[Rate Limiter] -->|Delay| D
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Backend
    participant Database

    User->>Backend: Request to /api/v1/stock-analysis/
    Backend->>Backend: Check X-API-Key header
    
    alt Header Missing
        Backend-->>User: 401 Unauthorized
    else Header Present
        Backend->>Database: Validate API key
        alt Key Valid
            Database-->>Backend: Key active
            Backend->>Backend: Process request
            Backend-->>User: 200 OK + Data
        else Key Invalid
            Database-->>Backend: Key not found
            Backend-->>User: 401 Unauthorized
        end
    end
```

---

## API Documentation

### Authentication

All endpoints except `/health/`, `/api/docs/`, and `/api/schema/` require API key authentication.

**Generating an API Key (Local Development):**

```bash
python manage.py generate_apikey "Development"
# Output: Generated API Key: abc123def456...
```

**Using the API Key:**

```bash
curl -H "X-API-Key: abc123def456..." \
  "https://your-backend.onrender.com/api/v1/stock-analysis/?symbol=AAPL"
```

**Request Headers:**

| Header | Value | Required |
|--------|-------|----------|
| `X-API-Key` | Your API key | Yes |
| `Content-Type` | `application/json` | For POST requests |

**Response Headers:**

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per minute (200) |
| `X-RateLimit-Remaining` | Remaining requests this minute |
| `X-RateLimit-Reset` | Seconds until limit resets |

### API Versioning

All endpoints use version `v1` with the prefix `/api/v1/`.

| Version | Base URL | Status |
|---------|----------|--------|
| v1 | `/api/v1/` | Current, stable |
| Legacy | `/api/` | Deprecated (redirects to v1) |

### Standard Response Format

**Success Response:**

```json
{
    "success": true,
    "data": {
        // Endpoint-specific data
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

**Error Response:**

```json
{
    "success": false,
    "error": "Human-readable error message",
    "code": 401,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 1001 | Invalid API key |
| 1002 | Missing API key |
| 2001 | Missing required parameter |
| 2002 | Invalid parameter value |
| 3001 | Rate limit exceeded |
| 4001 | Resource not found |
| 9001 | Internal server error |

---

### Endpoints

#### 1. Health Check

**Method:** `GET`
**URL:** `/health/`
**Authentication:** Not required

```bash
curl https://your-backend.onrender.com/health/
```

**Response:**
```json
{
    "status": "ok",
    "redis": false
}
```

---

#### 2. Unified Stock Analysis

**Method:** `GET`
**URL:** `/api/v1/stock-analysis/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | Yes | - | Stock ticker (e.g., AAPL) |
| `risk_type` | string | No | `medium` | `low`, `medium`, `high` |
| `hold_time` | string | No | `medium-term` | `short-term`, `medium-term`, `long-term` |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/stock-analysis/?symbol=AAPL"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "company": "Apple Inc.",
        "symbol": "AAPL",
        "recommendation": "HOLD",
        "confidence": 0.5,
        "sentiment": {
            "overall": "Neutral",
            "score": 0.5,
            "recent_articles": 0
        },
        "technicalIndicators": {
            "currentPrice": 116.16,
            "sma50": 114.84,
            "sma200": 111.81,
            "rsi": 70.8,
            "support": 110.35,
            "resistance": 121.97,
            "volume": 12424000
        },
        "priceTargets": {
            "bearish": 104.54,
            "base": 116.16,
            "bullish": 132.42
        },
        "keyFactors": [
            {
                "title": "Market Sentiment",
                "description": "Based on recent news",
                "impact": "neutral"
            }
        ],
        "riskAssessment": {
            "level": "medium",
            "horizon": "medium-term"
        },
        "lastUpdated": "2026-07-14T10:00:00Z"
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 3. Technical Indicators

**Method:** `GET`
**URL:** `/api/v1/technical-indicators/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `symbol` | string | Yes | - |
| `timeframe` | string | No | `1d` |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/technical-indicators/?symbol=AAPL"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "technical": {
            "current_price": 116.16,
            "sma_50": 114.84,
            "sma_200": 111.81,
            "rsi": 70.8,
            "support": 110.35,
            "resistance": 121.97,
            "pivot": 116.16,
            "volume": 12424000,
            "volatility": 0.15,
            "price_history": [112.00, 112.58, ...]
        }
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 4. News with Sentiment

**Method:** `GET`
**URL:** `/api/v1/news/get-news/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `symbol` | string | Yes | - |
| `refresh` | boolean | No | `false` |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/news/get-news/?symbol=AAPL"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "symbol": "AAPL",
        "news": [
            {
                "id": "abc123",
                "title": "Apple Reports Strong Earnings",
                "summary": "Apple Inc. reported Q3 earnings...",
                "source": "Reuters",
                "published_at": "2026-07-14T10:00:00Z",
                "sentiment": "positive",
                "confidence": 0.92,
                "banner_image_url": "https://example.com/image.jpg",
                "url": "https://example.com/article",
                "key_phrases": ["iPhone sales", "earnings beat"],
                "source_reliability": 85
            }
        ],
        "count": 10,
        "refresh_queued": false,
        "cache_stale": false
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 5. Symbol Search

**Method:** `GET`
**URL:** `/api/v1/news/symbol-search/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `q` | string | Yes (min 2 chars) |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/news/symbol-search/?q=Apple"
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "region": "United States"
        },
        {
            "symbol": "AAPL34",
            "name": "Apple Inc.",
            "region": "Brazil"
        }
    ],
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 6. Prediction History

**Method:** `GET`
**URL:** `/api/v1/prediction-history/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `symbol` | string | No | - |
| `limit` | integer | No | 50 |
| `offset` | integer | No | 0 |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/prediction-history/?symbol=AAPL&limit=10"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "count": 125,
        "next": 100,
        "previous": 0,
        "results": [
            {
                "id": 1,
                "stock_symbol": "AAPL",
                "predicted_movement": "UP",
                "confidence": 0.82,
                "date": "2026-07-12T10:00:00Z"
            }
        ]
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 7. LSTM Prediction

**Method:** `GET`
**URL:** `/api/v1/lstm-predict/`
**Authentication:** Required

**Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `symbol` | string | Yes |
| `news` | string | No |

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/lstm-predict/?symbol=AAPL&news=Apple%20earnings"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "symbol": "AAPL",
        "prediction": "UP",
        "confidence": 53.5,
        "sentiment_score": 0.0,
        "timestamp": "2026-07-14T10:00:00Z"
    },
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 8. Subscribe

**Method:** `POST`
**URL:** `/api/v1/subscribe/`
**Authentication:** Required

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

```bash
curl -X POST \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}' \
  "https://your-backend.onrender.com/api/v1/subscribe/"
```

**Response:**
```json
{
    "success": true,
    "message": "Subscribed successfully.",
    "code": 201,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 9. Available Symbols

**Method:** `GET`
**URL:** `/api/v1/symbols/`
**Authentication:** Required

```bash
curl -H "X-API-Key: your_key" \
  "https://your-backend.onrender.com/api/v1/symbols/"
```

**Response:**
```json
{
    "success": true,
    "data": [
        {"symbol": "AAPL", "name": "Apple Inc.", "region": "US"},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "region": "US"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "region": "US"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "region": "US"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "region": "US"},
        {"symbol": "NVDA", "name": "NVIDIA Corp.", "region": "US"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "region": "US"},
        {"symbol": "IBM", "name": "International Business Machines", "region": "US"}
    ],
    "code": 200,
    "timestamp": "2026-07-14T10:00:00Z"
}
```

---

#### 10. API Documentation

**Interactive Documentation:**

| Resource | URL | Description |
|----------|-----|-------------|
| Swagger UI | `/api/docs/` | Interactive API explorer |
| OpenAPI Schema | `/api/schema/` | Machine-readable spec |

```bash
# Open Swagger UI in browser
open https://your-backend.onrender.com/api/docs/

# Download OpenAPI schema
curl https://your-backend.onrender.com/api/schema/ > schema.json
```

**To import into Postman:**
1. Open Postman
2. Click Import -> Link
3. Paste: `https://your-backend.onrender.com/api/schema/`
4. Click Import

---

## Getting an API Key

### For Production

API keys are required for all authenticated endpoints. To obtain one:

1. **Contact the administrator** at anyega.alex.kamau@gmail.com
2. Provide your name and use case
3. You'll receive a unique API key via email

### For Development

Generate a local key:

```bash
python manage.py generate_apikey "Development"
# Output: Generated API Key: abc123def456...
```

### For Testing

```bash
python manage.py generate_apikey "Testing"
```

**Important:** Keep your API key secure. Never commit it to version control.
Use environment variables for all secrets.

---

## Installation

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 20+ |
| PostgreSQL | 16+ |
| Redis | 7+ (optional) |

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines.git
cd sentiment_driven_stock_price_prediction_engine
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run database migrations:

```bash
python manage.py migrate
python manage.py createcachetable
```

6. Generate an API key:

```bash
python manage.py generate_apikey "Development"
```

7. Create a superuser (optional):

```bash
python manage.py createsuperuser
```

8. Start the development server:

```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install Node dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env.development
# Edit with your configuration
```

4. Start the development server:

```bash
npm run dev
```

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Generate API key
docker-compose exec web python manage.py generate_apikey "Development"
```

---

## Environment Variables

### Backend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SECRET_KEY` | Yes | Django secret key | `django-insecure-...` |
| `DEBUG` | Yes | Development mode | `True` or `False` |
| `DATABASE_URL` | Yes | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `ALLOWED_HOSTS` | Yes | Allowed hostnames | `localhost,127.0.0.1` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `http://localhost:5173` |
| `ALPHA_VANTAGE_KEY` | Yes | Alpha Vantage API key | `your_key` |
| `FINNHUB_API_KEY` | No | Finnhub API key | `your_key` |
| `RAPIDAPI_KEY` | No | RapidAPI key | `your_key` |
| `RAPIDAPI_HOST` | No | RapidAPI host | `apidojo-yahoo-finance-v1.p.rapidapi.com` |
| `REDIS_URL` | No | Redis connection | `redis://localhost:6379/1` |
| `ENABLE_LSTM` | No | Enable LSTM predictions | `False` |
| `LSTM_MODEL_PATH` | No | Path to LSTM model | `models/model.pth` |
| `STATIC_API_KEY` | No | Static API key (optional fallback) | `your_key` |

### Frontend (.env.development)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API URL | `http://localhost:8000` |
| `VITE_API_KEY` | Yes | API key for authentication | `your_api_key` |
| `VITE_USE_MOCK_DATA` | No | Use mock data | `true` or `false` |

---

## Deployment

### Backend Deployment (Render)

1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Configure environment variables
5. Set build command: `./build.sh`
6. Set start command: `gunicorn sentiment_driven_stock_price_prediction_engine.wsgi:application`

**Environment Variables on Render:**

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Your Django secret key |
| `DEBUG` | `False` |
| `DATABASE_URL` | Render PostgreSQL URL |
| `ALLOWED_HOSTS` | `your-service.onrender.com` |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `ALPHA_VANTAGE_KEY` | Your API key |
| `ENABLE_LSTM` | `False` |

### Frontend Deployment (Vercel)

1. Push code to GitHub
2. Import project on Vercel
3. Configure environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` |
| `VITE_API_KEY` | Your production API key |
| `VITE_USE_MOCK_DATA` | `false` |

4. Deploy

### Deployment Checklist

**Backend:**

- [ ] All environment variables configured
- [ ] PostgreSQL database created and connected
- [ ] Migrations run: `python manage.py migrate`
- [ ] API key generated: `python manage.py generate_apikey "Production Frontend"`
- [ ] Health check passes: `curl /health/`
- [ ] Authenticated endpoint works: `curl -H "X-API-Key: key" /api/v1/stock-analysis/?symbol=AAPL`

**Frontend:**

- [ ] Environment variables configured
- [ ] API key matches backend
- [ ] API base URL does NOT include `/api/v1` (interceptor adds it)
- [ ] Production build passes: `npm run build`
- [ ] Dashboard loads correctly
- [ ] Data fetches from backend

---

## Quick Test Commands

```bash
# Set your API key
API_KEY="your_api_key_here"

# Health check (public)
curl https://your-backend.onrender.com/health/

# Stock analysis (authenticated)
curl -H "X-API-Key: $API_KEY" \
  "https://your-backend.onrender.com/api/v1/stock-analysis/?symbol=AAPL"

# Technical indicators
curl -H "X-API-Key: $API_KEY" \
  "https://your-backend.onrender.com/api/v1/technical-indicators/?symbol=AAPL"

# News
curl -H "X-API-Key: $API_KEY" \
  "https://your-backend.onrender.com/api/v1/news/get-news/?symbol=AAPL"

# Symbol search
curl -H "X-API-Key: $API_KEY" \
  "https://your-backend.onrender.com/api/v1/news/symbol-search/?q=Apple"

# LSTM prediction
curl -H "X-API-Key: $API_KEY" \
  "https://your-backend.onrender.com/api/v1/lstm-predict/?symbol=AAPL&news=Apple%20earnings"

# View API documentation
open https://your-backend.onrender.com/api/docs/
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `relation "authentication_apikey" does not exist` | Migrations not run | `python manage.py migrate` |
| `SSL connection has been closed unexpectedly` | Database SSL configuration | Set `ssl_require=True` in database config |
| `Invalid HTTP_HOST header` | ALLOWED_HOSTS missing | Add domain to ALLOWED_HOSTS |
| `401 Unauthorized` | API key missing or invalid | Generate key and add to requests |
| `429 Too Many Requests` | Rate limit exceeded | Wait for reset or upgrade tier |
| `ModuleNotFoundError: No module named 'drf_spectacular'` | Package missing | `pip install drf-spectacular` |
| `Duplicate /api/v1/ in URL` | Interceptor adds prefix twice | Ensure `VITE_API_BASE_URL` is root domain only |

### Viewing Logs

**Render:**
1. Go to Render Dashboard
2. Click your service
3. Click **Logs** tab

**Vercel:**
1. Go to Vercel Dashboard
2. Click your project
3. Click **Deployments**
4. Click **View Logs**

**Locally:**
```bash
# Django logs
python manage.py runserver --verbosity 3

# Celery logs (if using)
celery -A sentiment_driven_stock_price_prediction_engine worker --loglevel=debug
```

---

## Tech Stack

### Backend
- **Django 5.1** – Web framework
- **Django REST Framework** – API development
- **PostgreSQL 16** – Primary database
- **Redis 7** – Caching (optional)
- **Celery 5.3** – Async tasks (optional)
- **FinBERT** – Sentiment analysis (Hugging Face Transformers)
- **spaCy** – NLP and key phrase extraction
- **Joblib** – Model persistence

### Frontend
- **React 18** – UI framework
- **React Router 6** – Routing
- **React Query 5** – Data fetching and caching
- **Chart.js / Recharts** – Data visualization
- **Tailwind CSS 3** – Styling
- **Vite 5** – Build tool
- **Axios** – HTTP client

### ML Pipeline
- **PyTorch** – Deep learning (LSTM)
- **scikit-learn** – ML pipeline (TF-IDF, Logistic Regression)
- **pandas** – Data manipulation
- **numpy** – Numerical computing
- **Dask** – Large data processing
- **Gradio** – Interactive ML interface

### DevOps
- **Docker** – Containerization
- **Docker Compose** – Multi-container orchestration
- **Vercel** – Frontend hosting
- **Render** – Backend hosting
- **Hugging Face Spaces** – ML model hosting
- **GitHub Actions** – CI/CD (optional)

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```
3. **Make your changes**
4. **Run tests**:
   ```bash
   python manage.py test
   npm test
   ```
5. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add your feature"
   ```
6. **Push** to your branch:
   ```bash
   git push origin feature/your-feature
   ```
7. **Open a Pull Request** against `main`

**Guidelines:**
- Follow existing code style
- Include tests for new features
- Update documentation
- Keep commits atomic and well-described
- Reference related issues in PR description

---

## Roadmap

### Phase 1: Core Features (✅ Complete)
- [x] Real-time stock data fetching
- [x] Sentiment analysis with FinBERT
- [x] LSTM price predictions
- [x] Interactive dashboard
- [x] API key authentication
- [x] Rate limiting
- [x] Swagger/OpenAPI documentation

### Phase 2: Enhancements (🔄 In Progress)
- [ ] Self-service API key portal
- [ ] Email notifications for alerts
- [ ] Watchlist feature
- [ ] Stock comparison tool
- [ ] AI-powered market summaries
- [ ] Mobile-responsive improvements

### Phase 3: Advanced Features (📋 Planned)
- [ ] Social media sentiment (Twitter/Reddit API)
- [ ] WebSocket real-time updates
- [ ] Native mobile app
- [ ] Portfolio tracking
- [ ] Custom alert rules
- [ ] Machine learning model improvements

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Disclaimer

**Not Financial Advice**

This project is for **educational and research purposes only**.

The predictions, analysis, and recommendations provided by this software are:
- Experimental and not guaranteed to be accurate
- Not a substitute for professional financial advice
- Based on historical data which may not predict future performance

**Always consult a qualified financial advisor before making investment decisions.**

**No Warranty**

This software is provided "as is", without warranty of any kind, express or implied,
including but not limited to the warranties of merchantability, fitness for a
particular purpose, and noninfringement.

**Use at Your Own Risk**

Investing involves risk. You are solely responsible for your investment decisions.

**Data Source Attribution**

This project uses data from:
- **Alpha Vantage** – Stock data and news (alphavantage.co)
- **Finnhub** – News data (finnhub.io)
- **Yahoo Finance** – Stock data (finance.yahoo.com)
- **FinBERT** – Sentiment model (Prosus AI)

All data is subject to the terms and conditions of these providers.

**Liability**

The authors and contributors of this project are not liable for any financial loss,
damages, or other consequences arising from the use of this software.

---

## Contact

- **Author**: Anyega Alex Kamau
- **Email**: anyega.alex.kamau@gmail.com
- **LinkedIn**: [anyega-alex-kamau](https://linkedin.com/in/anyega-alex-kamau)
- **GitHub**: [AnyegaAlex](https://github.com/AnyegaAlex)
- **Portfolio**: [tickflowcapital.com](https://tickflowcapital.com)

---

## Acknowledgments

- **Alpha Vantage** for providing financial data APIs
- **Finnhub** for news data
- **Hugging Face** for hosting models and spaces
- **Vercel** for frontend hosting
- **Render** for backend hosting

---

Built with Python, Django, React, and machine learning.

*Making investing smarter with AI.*
```