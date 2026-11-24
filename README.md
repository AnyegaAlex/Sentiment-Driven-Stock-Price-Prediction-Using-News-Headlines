# Tickflow Intelligence - AI Stock Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1-brightgreen)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## Table of Contents

- [Live Demo](#live-demo)
- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Monitoring](#monitoring)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## Live Demo

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | [https://intelligence.tickflowcapital.com/](https://intelligence.tickflowcapital.com/) | Live |
| Backend API (Render) | [https://sentiment-driven-stock-price-prediction.onrender.com](https://sentiment-driven-stock-price-prediction.onrender.com) | Verify before use |
| API Documentation (Swagger) | [https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/](https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/) | Verify before use |
| LSTM Model (Gradio) | [https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics](https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics) | Verify before use |

---

## Overview

Tickflow Intelligence is an AI-powered stock intelligence platform built by [Tickflow Capital](https://tickflowcapital.com/).

**What the platform does:**
- An LSTM model (PyTorch) produces UP, DOWN, or HOLD predictions with a confidence score
- FinBERT (`ProsusAI/finbert`) scores the sentiment of news headlines
- A REST API with JWT and API key authentication and per-client rate limits
- A React dashboard for stock analysis, predictions, and account settings

**Rate limits (from settings):**
- API keys: 200 requests/minute
- Authenticated users: 1,000 requests/hour
- Anonymous users: 100 requests/hour

---

## Key Capabilities

### 1. LSTM Neural Network Predictions
- Directional predictions: UP, DOWN, HOLD
- Confidence scoring from 0 to 100 percent
- 7-day resolution tracking with accuracy calculation

### 2. FinBERT Sentiment Analysis
- Model: FinBERT (`ProsusAI/finbert`)
- Classifies sentiment as Positive, Negative, or Neutral

### 3. Technical Indicators (unverified: not found in the stocks code during review)
- SMA-50 and SMA-200
- RSI (Relative Strength Index)
- Bollinger Bands (Upper and Lower)
- Support and Resistance levels
- Pivot Points
- Volatility and Volume metrics
- 30-day price history

### 4. Hybrid Prediction Model (unverified: weights not found in the code during review)
- Intended to combine LSTM output, sentiment analysis, and technical indicators
- Sentiment-only fallback when LSTM model is unavailable

### 5. Automated Prediction Resolution (Cron Jobs)
- Predictions resolve 7 days after creation
- Scheduled job fetches current prices (`resolve_predictions` management command)
- Compares predicted vs actual movement
- Updates accuracy metrics and user statistics
- Logs resolution results

### 6. REST API
- REST API with JWT and API key authentication
- Rate limiting: 200 requests/minute for API keys
- Multiple API keys per user with revocation
- OpenAPI/Swagger documentation

### 7. User Dashboard
- Stock analysis
- Prediction history
- User profile and settings
- Theme settings

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

## Documentation

Complete documentation is available in the [GitHub Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

### Wiki Sections
- **Getting Started**: Introduction, Quick Start, Installation, Configuration
- **Authentication and API**: API Key Management, Rate Limiting, Authentication Flow, Error Codes
- **API Reference**: 11 endpoints documented with examples
- **Deployment**: Backend (Render), Frontend (Vercel), Docker, Deployment Checklist, CI/CD
- **Architecture**: System Overview, Frontend, Backend, ML Pipeline, Database Schema, Caching
- **Machine Learning**: LSTM Model, Sentiment Analysis, Hybrid Model, Model Evaluation
- **Development Guide**: Environment Setup, Code Structure, Coding Standards, Testing, Debugging
- **Security**: Overview, Authentication, Headers, Data Protection, Vulnerability Management
- **Monitoring**: Metrics, Logging, Alerting, Dashboards
- **User Guide**: Getting Started, Dashboard, Predictions, Account Management
- **Contributing**: How to Contribute, Code of Conduct, Governance
- **Legal**: License, Disclaimer, Data Attribution
- **Appendices**: Environment Variables, System Requirements, API Changelog, Glossary, FAQ

### Quick API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/stock-analysis/` | GET | Unified stock analysis with sentiment and predictions |
| `/api/v1/technical-indicators/` | GET | Technical indicators only |
| `/api/v1/news/get-news/` | GET | News with sentiment analysis |
| `/api/v1/lstm-predict/` | GET | LSTM prediction |
| `/api/v1/prediction-history/` | GET | Historical predictions |
| `/api/v1/symbols/` | GET | Supported symbols |
| `/health/` | GET | Health check |

Full API documentation is available in the [Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

---

## Quick Start

Get the backend running in 5 minutes.

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (optional)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence.git
cd sentiment_driven_stock_price_prediction_engine

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run migrations
python manage.py migrate
python manage.py createcachetable

# Generate an API key
python manage.py generate_apikey "Development"

# Start the server
python manage.py runserver
```

### First API Call

```bash
curl -H "X-API-Key: your_api_key" \
  "http://localhost:8000/api/v1/stock-analysis/?symbol=AAPL"
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.development
npm run dev
```

---

## Installation

### Backend Setup

1. Clone the repository
2. Create and activate virtual environment
3. Install dependencies: `pip install -r requirements.txt`
4. Configure environment variables
5. Run migrations: `python manage.py migrate`
6. Generate an API key
7. Start the server: `python manage.py runserver`

### Frontend Setup

1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start the server: `npm run dev`

### Docker Setup

```bash
docker build -t tickflow-backend sentiment_driven_stock_price_prediction_engine
docker exec <container-id> python manage.py migrate
docker exec <container-id> python manage.py generate_apikey "Development"
```

Detailed installation guide is available in the [Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SECRET_KEY` | Yes | Django secret key | `django-insecure-...` |
| `DEBUG` | Yes | Development mode | `True` or `False` |
| `DATABASE_URL` | Yes | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `ALLOWED_HOSTS` | Yes | Allowed hostnames | `localhost,127.0.0.1` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `http://localhost:5173` |
| `ALPHA_VANTAGE_KEY` | Yes | Alpha Vantage API key | `your_key` |
| `FINNHUB_API_KEY` | No | Finnhub API key | `your_key` |
| `REDIS_URL` | No | Redis connection | `redis://localhost:6379/1` |
| `ENABLE_LSTM` | No | Enable LSTM predictions | `False` |

### Frontend (`.env.development`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API URL | `http://localhost:8000` |
| `VITE_API_KEY` | Yes | API key for authentication | `your_api_key` |
| `VITE_USE_MOCK_DATA` | No | Use mock data | `true` or `false` |

---

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create Web Service on Render
3. Configure environment variables
4. Set build command: `./build.sh`
5. Set start command: `gunicorn sentiment_driven_stock_price_prediction_engine.wsgi:application`

Detailed deployment guide is available in the [Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

### Frontend (Vercel)

1. Push code to GitHub
2. Import project on Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t tickflow-backend sentiment_driven_stock_price_prediction_engine
```

---

## Tech Stack

### Backend
- Django 5.1
- Django REST Framework
- PostgreSQL (Neon in production)
- Redis (optional cache)

### Frontend
- React 18
- React Router 7
- React Query 5
- Vite 6
- Axios

### Machine Learning
- PyTorch
- FinBERT (Hugging Face Transformers)
- pandas
- numpy

### DevOps
- Docker
- Vercel (frontend)
- Render (backend)
- Hugging Face Spaces (ML model)
- GitHub Actions (data ingestion, prediction pipeline, database maintenance, deploy; no test workflow)

---

## Monitoring

### Automated Prediction Resolution (Cron Jobs)

Predictions resolve 7 days after creation. A scheduled job:
- Fetches current stock prices for pending predictions
- Compares predicted vs actual movement
- Updates accuracy metrics and user statistics
- Logs resolution results

### Error Tracking
- Sentry integration for real-time error monitoring
- JSON structured logging for all requests
- Request IDs for traceability
- Audit logging for sensitive actions

---

## Security

### Authentication
- API keys for external API access (stored as SHA-256 hashes)
- JWT tokens for frontend authentication (60 min access, 7 day refresh)
- Multiple API keys per user with individual revocation

### Rate Limiting
- API Keys: 200 requests/minute
- Authenticated Users: 1000 requests/hour
- Anonymous Users: 100 requests/hour

### Data Protection
- API keys hashed, never stored in plain text
- Passwords hashed with Django's default password hasher (PBKDF2)

Full security documentation is available in the [Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes with tests (`pytest` in `sentiment_driven_stock_price_prediction_engine`; `npm test` in `frontend`)
4. Commit with a clear message
5. Push to your branch
6. Open a Pull Request against `master`, the repository's default branch

**Guidelines:**
- Follow existing code style
- Include tests for new features
- Update documentation
- Reference related issues in PR description

Full contributing guide is available in the [Wiki](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/wiki).

---

## License

MIT License. See the [LICENSE](LICENSE) file for details.

---

## Disclaimer

This project is for educational and research purposes only. The predictions, analysis, and recommendations provided by this software are:
- Experimental and not guaranteed to be accurate
- Not a substitute for professional financial advice
- Based on historical data which may not predict future performance

Always consult a qualified financial advisor before making investment decisions.

---

## Contact

- **Company**: [Tickflow Capital](https://tickflowcapital.com/)
- **Author**: Anyega Alex Kamau
- **Email**: anyega.alex.kamau@gmail.com
- **GitHub**: [AnyegaAlex](https://github.com/AnyegaAlex)

---

## Support My Work

If you find my open-source projects useful, you can support ongoing development:

<p align="center">
  <img width="160" height="160" alt="BNB20QR" src="https://github.com/user-attachments/assets/ffbb43dc-4610-466f-9d4b-56427ca391c0" />
  <img width="160" height="160" alt="TRONQR" src="https://github.com/user-attachments/assets/833f0bfe-ad8e-450b-8345-f3904879180e" />
  <img width="160" height="160" alt="BTCQR" src="https://github.com/user-attachments/assets/e46dc59c-cb87-4944-bb4a-4733a1626d57" />
</p>

<p align="center">
  <sub>BNB Chain (BEP20) &nbsp;·&nbsp; TRON (TRC20) &nbsp;·&nbsp; Bitcoin</sub>
</p>

**USDT / USDC (Recommended)**  
Network: BNB Smart Chain (BEP20)  
`0xCfB8a1b4Abaec2DEF899F7df6F522D705DE58401`

**USDT (Alternative)**  
Network: TRON (TRC20)  
`TVi1M9Kpiaz48eytVzeqJjBd4MBTCbB2TL`

**Bitcoin (BTC)**  
`bc1qd47q5xmc6edlcspn9f3ecakkfaedwrt932w476`

⚠️ *Please only use the networks listed above. Sending on the wrong network will result in permanent loss of funds.*

---
## Acknowledgments

- Alpha Vantage for financial data APIs
- Finnhub for news data
- Hugging Face for hosting models and spaces
- Vercel for frontend hosting
- Render for backend hosting
