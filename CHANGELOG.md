# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] – 2026-07-14

### Added

#### Backend
- Django 5.1 REST API with versioning (`/api/v1/`)
- API key authentication with `X-API-Key` header
- Rate limiting (200 requests/minute per key)
- FinBERT sentiment analysis integration
- LSTM price prediction model
- Multi-source news aggregation (Alpha Vantage, Finnhub, Yahoo Finance)
- Redis caching with memory fallback
- PostgreSQL database with connection pooling
- Swagger/OpenAPI documentation
- Health check endpoint (`/health/`)
- Standardized error responses
- Deprecation headers for legacy endpoints

#### Frontend
- React 18 dashboard with three analysis cards
- StockOpinionCard with recommendation and technicals
- TechnicalIndicatorsCard with charts and indicators
- SentimentAnalysisCard with sentiment visualization
- News list with sentiment badges and key phrases
- Prediction history with pagination
- Investment preferences (risk, hold time, detail level)
- Responsive design for all screen sizes
- Dark mode support
- Accessibility (WCAG 2.2 AA compliant)

#### ML Pipeline
- FinBERT sentiment classification
- LSTM neural network for price prediction
- Scikit-learn pipeline with TF-IDF and Logistic Regression
- Gradio interface for interactive predictions
- Model persistence with Joblib

#### Infrastructure
- Docker and Docker Compose support
- Vercel frontend deployment
- Render backend deployment
- Hugging Face Spaces ML deployment

### Changed

#### Backend
- Migrated from Celery to synchronous processing (free tier optimized)
- Improved API key validation with static fallback
- Enhanced error handling with standardized responses

#### Frontend
- Consolidated API client to single instance
- Removed duplicate components (DashboardCards, StockDashboard)
- Improved React Query caching with 5-minute stale time
- Enhanced data transformers for API responses

#### Documentation
- Added comprehensive API documentation
- Added Swagger/OpenAPI integration
- Added deployment guides
- Added troubleshooting section

### Fixed

#### Backend
- SSL database connection errors
- Duplicate `/api/v1/` in URLs
- API key table missing on Render
- Yahoo Finance rate limit handling
- Technical indicators zero values

#### Frontend
- `phrases.slice(...).map is not a function` error
- `toUpperCase()` on undefined
- Prediction history chart data formatting
- Symbol persistence across navigation
- 404 on page refresh (Vercel rewrite)

### Security

- Added API key authentication
- Added rate limiting
- Added CORS restrictions
- Added security headers (HSTS, X-Frame-Options, etc.)
- Added environment variable validation

### Deprecated

- `/api/*` endpoints (redirect to `/api/v1/*`)
- `StockOpinionView` legacy endpoint

### Removed

- Celery dependency (free tier optimization)
- Mock data services (production use only real API)
- Duplicate API client (`api.js`)
- Duplicate components (`DashboardCards`, `StockDashboard`)

---

## [0.9.0] – 2026-06-30

### Added

- Initial project structure
- Basic Django API
- React frontend setup
- Alpha Vantage integration

### Known Issues

- Yahoo Finance rate limiting
- No API key authentication
- Limited error handling
- No caching

---

## [Unreleased]

### Planned
- AI-powered market summaries
- Self-service API key portal
- Social media sentiment (Twitter/Reddit)
- WebSocket real-time updates
- Native mobile app
- Stock comparison tool
- Watchlist feature

---

**Version Scheme:**
- **Major** – Breaking changes
- **Minor** – New features (backward compatible)
- **Patch** – Bug fixes (backward compatible)

---

**Legend:**
- ✅ `Added` – New features
- 🔧 `Changed` – Changes to existing features
- 🐛 `Fixed` – Bug fixes
- 🔒 `Security` – Security improvements
- ⚠️ `Deprecated` – Soon-to-be removed features
- ❌ `Removed` – Removed features
- 📝 `Documentation` – Documentation updates

---

**Last Updated:** July 14, 2026