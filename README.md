# Sentiment-Driven Stock Price Prediction Using News Headlines

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1-brightgreen)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Live Demo

| Component | URL | Status |
|-----------|-----|--------|
| Frontend (Vercel) | [https://sentiment-driven-stock-price-predic.vercel.app/](https://sentiment-driven-stock-price-predic.vercel.app/) | Live |
| Backend API (Render) | [https://sentiment-driven-stock-price-prediction.onrender.com](https://sentiment-driven-stock-price-prediction.onrender.com/health/) | Live |
| API Documentation | [https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/](https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/) | Live |
| LSTM Model (Hugging Face) | [https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics](https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics) | Live |

---

## Overview

This project delivers a real-time stock sentiment analysis platform that leverages NLP and machine learning to predict stock price movements based on financial news headlines. The system aggregates news from multiple sources, performs sentiment analysis using FinBERT, and provides an interactive dashboard for market monitoring.

---

## Key Features

### 1. Automated News Aggregation
- Multi-source integration with Alpha Vantage, Yahoo Finance, and Finnhub
- SHA-256 based duplicate detection for unique articles
- Dynamic filtering by date, sentiment, and source reliability

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
- Scikit-learn pipeline with TF-IDF and Logistic Regression
- Model persistence with Joblib
- Gradio interface for interactive predictions

---

## System Architecture

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

**Generating an API Key:**

```bash
python manage.py generate_apikey "Production Frontend"
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

**Example:**

```
# Recommended (v1)
GET /api/v1/stock-analysis/?symbol=AAPL

# Legacy (redirects to v1)
GET /api/stock-analysis/?symbol=AAPL
```

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

### Environment Variables

**Backend (.env):**

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

**Frontend (.env.development):**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API URL | `http://localhost:8000/api/v1` |
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
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api/v1` |
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
- [ ] API base URL includes `/api/v1`
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
- Django 5.1, Django REST Framework
- PostgreSQL 16 with pgvector
- Redis 7 for caching
- FinBERT (Hugging Face Transformers)
- spaCy for NLP
- Joblib for model persistence

### Frontend
- React 18, React Router 6
- React Query 5, Axios
- Chart.js, Recharts
- Tailwind CSS 3
- Vite 5

### ML Pipeline
- Scikit-learn (Logistic Regression, TF-IDF)
- Dask for large data processing
- Gradio for interactive predictions
- PyTorch for deep learning (LSTM)

### DevOps
- Docker, Docker Compose
- Git LFS for model files
- GitHub Actions for CI/CD

---

## Contributing

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Make your changes
4. Run tests:
   ```bash
   python manage.py test
   npm test
   ```
5. Commit with a clear message:
   ```bash
   git commit -m "feat: add your feature"
   ```
6. Push to your branch:
   ```bash
   git push origin feature/your-feature
   ```
7. Open a Pull Request against `main`

**Guidelines:**
- Follow existing code style
- Include tests for new features
- Update documentation
- Keep commits atomic and well-described

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contact

- Author: Anyega Alex Kamau
- Email: anyega.alex.kamau@gmail.com
- LinkedIn: [anyega-alex-kamau](https://linkedin.com/in/anyega-alex-kamau)
- GitHub: [AnyegaAlex](https://github.com/AnyegaAlex)

---

Built with ❤️ by AnyegaAlex – making investing smarter with AI.
