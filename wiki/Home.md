# Home

**File:** `/wiki/Home.md`

---

## Introduction

Tickflow is an open-source AI-powered stock intelligence platform that combines LSTM neural networks, FinBERT sentiment analysis, and technical indicators to generate stock predictions with 63% accuracy. The platform processes over 10,000 financial news articles daily, providing real-time sentiment analysis and market intelligence.

This is the first open-source and auditable project from Tickflow Capital, designed to make AI-driven stock analysis accessible to traders, quantitative analysts, developers, and students.

---

## Quick Links

| Section | Description |
|---------|-------------|
| [Getting Started](1.1-Introduction.md) | Introduction and setup guides |
| [API Reference](3.1-Overview.md) | Complete API documentation |
| [Deployment](4.1-Backend-Deployment-Render.md) | Deployment guides for production |
| [Architecture](5.1-System-Overview.md) | System design and architecture |
| [Machine Learning](6.1-LSTM-Model.md) | ML model documentation |
| [User Guide](10.1-Getting-Started-User.md) | End-user documentation |
| [Contributing](12.1-How-to-Contribute.md) | How to contribute to the project |

---

## Live Demo Links

| Component | URL | Status |
|-----------|-----|--------|
| Frontend (Vercel) | https://sentiment-driven-stock-price-predic.vercel.app/ | Live |
| Backend API (Render) | https://sentiment-driven-stock-price-prediction.onrender.com | Live |
| API Documentation (Swagger) | https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/ | Live |
| LSTM Model (Gradio) | https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics | Live |

---

## Repository

The complete source code is available on GitHub:
https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines

---

## Table of Contents

### 1. Getting Started
- [1.1 Introduction](1.1-Introduction.md) - Platform overview and value proposition
- [1.2 Quick Start Guide](1.2-Quick-Start-Guide.md) - Get running in 5 minutes
- [1.3 Installation](1.3-Installation.md) - Detailed installation instructions
- [1.4 Configuration](1.4-Configuration.md) - Environment variables and settings

### 2. Authentication and API
- [2.1 API Key Management](2.1-API-Key-Management.md) - Generating and using API keys
- [2.2 Rate Limiting](2.2-Rate-Limiting.md) - Rate limits and headers
- [2.3 Authentication Flow](2.3-Authentication-Flow.md) - How authentication works
- [2.4 Error Codes](2.4-Error-Codes.md) - Error code reference

### 3. API Reference
- [3.1 Overview](3.1-Overview.md) - API base URL and response formats
- [3.2 Stock Analysis API](3.2-Stock-Analysis-API.md) - GET /api/v1/stock-analysis/
- [3.3 Technical Indicators API](3.3-Technical-Indicators-API.md) - GET /api/v1/technical-indicators/
- [3.4 News and Sentiment API](3.4-News-Sentiment-API.md) - GET /api/v1/news/get-news/
- [3.5 LSTM Prediction API](3.5-LSTM-Prediction-API.md) - GET /api/v1/lstm-predict/
- [3.6 Prediction History API](3.6-Prediction-History-API.md) - GET /api/v1/prediction-history/
- [3.7 Subscription API](3.7-Subscription-API.md) - POST /api/v1/subscribe/
- [3.8 Symbols API](3.8-Symbols-API.md) - GET /api/v1/symbols/
- [3.9 Symbol Search API](3.9-Symbol-Search-API.md) - GET /api/v1/news/symbol-search/
- [3.10 Health Check API](3.10-Health-Check-API.md) - GET /health/
- [3.11 API Best Practices](3.11-API-Best-Practices.md) - Caching, error handling, optimization

### 4. Deployment
- [4.1 Backend Deployment (Render)](4.1-Backend-Deployment-Render.md) - Deploy to Render
- [4.2 Frontend Deployment (Vercel)](4.2-Frontend-Deployment-Vercel.md) - Deploy to Vercel
- [4.3 Docker Deployment](4.3-Docker-Deployment.md) - Docker setup and configuration
- [4.4 Deployment Checklist](4.4-Deployment-Checklist.md) - Pre-deployment verification
- [4.5 Continuous Integration and Deployment](4.5-CI-CD.md) - CI/CD pipelines

### 5. Architecture
- [5.1 System Overview](5.1-System-Overview.md) - Component diagram and data flow
- [5.2 Frontend Architecture](5.2-Frontend-Architecture.md) - React frontend design
- [5.3 Backend Architecture](5.3-Backend-Architecture.md) - Django backend design
- [5.4 ML Pipeline](5.4-ML-Pipeline.md) - Machine learning pipeline
- [5.5 Database Schema](5.5-Database-Schema.md) - Database design and models
- [5.6 Caching Strategy](5.6-Caching-Strategy.md) - Redis caching implementation

### 6. Machine Learning
- [6.1 LSTM Model](6.1-LSTM-Model.md) - LSTM architecture and training
- [6.2 Sentiment Analysis (FinBERT)](6.2-Sentiment-Analysis.md) - FinBERT integration
- [6.3 Hybrid Model](6.3-Hybrid-Model.md) - Combining LSTM and sentiment
- [6.4 Model Evaluation](6.4-Model-Evaluation.md) - Performance metrics and monitoring

### 7. Development Guide
- [7.1 Setting Up Development Environment](7.1-Development-Environment.md) - Local development setup
- [7.2 Code Structure](7.2-Code-Structure.md) - Project directory structure
- [7.3 Coding Standards](7.3-Coding-Standards.md) - Code style and quality guidelines
- [7.4 Testing](7.4-Testing.md) - Testing strategy and implementation
- [7.5 Adding a New Feature](7.5-Adding-Features.md) - Feature development process
- [7.6 Debugging](7.6-Debugging.md) - Debugging techniques and tools

### 8. Security
- [8.1 Security Overview](8.1-Security-Overview.md) - Security principles and threat model
- [8.2 Authentication and Authorization](8.2-Auth-Authorization.md) - Auth security details
- [8.3 Security Headers](8.3-Security-Headers.md) - HTTP security headers
- [8.4 Data Protection](8.4-Data-Protection.md) - Data encryption and handling
- [8.5 Vulnerability Management](8.5-Vulnerability-Management.md) - Vulnerability scanning and patching
- [8.6 Security Checklist](8.6-Security-Checklist.md) - Pre-deployment security verification

### 9. Monitoring and Analytics
- [9.1 Metrics Tracking](9.1-Metrics-Tracking.md) - Performance and business metrics
- [9.2 Logging](9.2-Logging.md) - Logging strategy and format
- [9.3 Alerting](9.3-Alerting.md) - Alert rules and notifications
- [9.4 Dashboards](9.4-Dashboards.md) - Monitoring dashboards

### 10. User Guide
- [10.1 Getting Started as a User](10.1-Getting-Started-User.md) - Creating an account and onboarding
- [10.2 Using the Dashboard](10.2-Using-Dashboard.md) - Dashboard features and navigation
- [10.3 Prediction Interpretations](10.3-Prediction-Interpretations.md) - Understanding predictions
- [10.4 Managing Your Account](10.4-Managing-Account.md) - Account management features

### 11. Troubleshooting
- [11.1 Common Issues and Solutions](11.1-Common-Issues.md) - Common problems and fixes
- [11.2 Error Reference](11.2-Error-Reference.md) - Complete error code reference
- [11.3 Performance Optimization](11.3-Performance-Optimization.md) - Optimization techniques

### 12. Contributing
- [12.1 How to Contribute](12.1-How-to-Contribute.md) - Contribution process and guidelines
- [12.2 Code of Conduct](12.2-Code-of-Conduct.md) - Community standards
- [12.3 Governance](12.3-Governance.md) - Project governance and decision-making

### 13. Legal
- [13.1 License](13.1-License.md) - MIT License details
- [13.2 Disclaimer](13.2-Disclaimer.md) - Legal disclaimer and liability
- [13.3 Data Attribution](13.3-Data-Attribution.md) - Data source attribution

### 14. Appendices
- [14.1 Environment Variables](14.1-Environment-Variables.md) - Environment variable reference
- [14.2 System Requirements](14.2-System-Requirements.md) - Hardware and software requirements
- [14.3 API Changelog](14.3-API-Changelog.md) - API version history
- [14.4 Glossary](14.4-Glossary.md) - Terminology reference
- [14.5 FAQ](14.5-FAQ.md) - Frequently asked questions