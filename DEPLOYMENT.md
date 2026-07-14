markdown
# Deployment Guide

This document provides detailed deployment instructions for all components.

---

## Prerequisites

| Tool | Required | Purpose |
|------|----------|---------|
| GitHub Account | ✅ Yes | Code hosting |
| Vercel Account | ✅ Yes | Frontend hosting |
| Render Account | ✅ Yes | Backend hosting |
| Hugging Face Account | ✅ Yes | ML hosting |
| PostgreSQL Database | ✅ Yes | Data storage |

---

## Backend Deployment (Render)

### 1. Create a Render Account

1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Verify your email

### 2. Create PostgreSQL Database

1. Click **New +** → **PostgreSQL**
2. Fill in:
   - Name: `sentiment_db`
   - Database: `sentiment_db`
   - User: `sentiment_user`
   - Region: Choose closest to you
   - Plan: Free
3. Click **Create Database**
4. Copy the **Internal Connection String**

### 3. Create Web Service

1. Click **New +** → **Web Service**
2. Connect to your GitHub repository
3. Fill in:
   - Name: `sentiment-driven-stock-price-prediction`
   - Environment: `Python`
   - Build Command:
     ```bash
     pip install -r requirements.txt
     python manage.py migrate --noinput
     python manage.py collectstatic --noinput
Start Command:

bash
gunicorn sentiment_driven_stock_price_prediction_engine.wsgi:application
Click Advanced → Add Environment Variable

4. Configure Environment Variables
Variable	Value
SECRET_KEY	Generate with python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG	False
DATABASE_URL	Internal Connection String from step 2
ALLOWED_HOSTS	sentiment-driven-stock-price-prediction.onrender.com
FRONTEND_URL	https://sentiment-driven-stock-price-predic.vercel.app
ALPHA_VANTAGE_KEY	Your Alpha Vantage API key
ENABLE_LSTM	False
5. Deploy
Click Create Web Service

Wait for deployment (2-5 minutes)

Verify health check:

bash
curl https://sentiment-driven-stock-price-prediction.onrender.com/health/
6. Generate API Key
bash
# In Render Shell
python manage.py generate_apikey "Production Frontend"
Copy the generated key for Vercel.

Frontend Deployment (Vercel)
1. Create a Vercel Account
Go to Vercel.com

Sign up with GitHub

Verify your email

2. Import Project
Click Import Project

Connect to your GitHub repository

Select the frontend directory:

Framework Preset: Vite

Root Directory: frontend

3. Configure Environment Variables
Variable	Value
VITE_API_BASE_URL	https://sentiment-driven-stock-price-prediction.onrender.com
VITE_API_KEY	Key from step 6 above
VITE_USE_MOCK_DATA	false
4. Deploy
Click Deploy

Wait for deployment (1-3 minutes)

Verify frontend loads:

Open https://sentiment-driven-stock-price-predic.vercel.app/

5. Handle 404 on Refresh
Create vercel.json in the frontend root:

json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
LSTM Model Deployment (Hugging Face)
1. Create a Hugging Face Account
Go to Hugging Face

Sign up

Verify your email

2. Create a Space
Go to Spaces

Click New Space

Fill in:

Name: stock-prediction-analytics

SDK: Gradio

Template: Blank

3. Upload Files
Go to the Files tab

Upload these files:

app.py (Gradio interface)

requirements.txt

Models (if applicable)

4. Configure Secrets
Go to Settings → Repository secrets:

Variable	Value
API_KEY	Your production API key
BACKEND_URL	https://sentiment-driven-stock-price-prediction.onrender.com
5. Deploy
Click Save

The Space will auto-deploy

Verify at:

text
https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics
Local Development
Backend
bash
# Clone repository
git clone https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines.git
cd sentiment_driven_stock_price_prediction_engine

# Setup virtual environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with local values

# Run migrations
python manage.py migrate
python manage.py createcachetable

# Generate API key
python manage.py generate_apikey "Development"

# Run server
python manage.py runserver
Frontend
bash
cd frontend
npm install
cp .env.example .env.development
# Edit .env.development with local values
npm run dev
Docker
bash
# Build and run
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Generate API key
docker-compose exec web python manage.py generate_apikey "Development"
Troubleshooting
Backend Issues
Issue	Solution
relation "authentication_apikey" does not exist	Run python manage.py migrate
SSL connection closed	Set ssl_require=True in database config
401 Unauthorized	Generate API key and use correct header
Duplicate /api/v1/ in URL	Ensure VITE_API_BASE_URL is root domain only
Frontend Issues
Issue	Solution
404 on refresh	Add vercel.json rewrites
API key missing	Set VITE_API_KEY in Vercel env vars
CORS errors	Add frontend URL to CORS_ALLOWED_ORIGINS
ML Model Issues
Issue	Solution
Unable to load model	Install accelerate package
Out of memory	Use smaller model or reduce batch size
Verification Checklist
Backend
Health check passes: /health/

API docs load: /api/docs/

Authenticated endpoint works: curl -H "X-API-Key: key" /api/v1/stock-analysis/?symbol=AAPL

Rate limit headers present

Frontend
Dashboard loads

Stock search works

Three cards display data

News tab works

Prediction history loads

Responsive on all devices

ML Model
Gradio interface loads

Predictions return results

API key authentication works

Rollback Procedure
Render
Go to Render Dashboard

Click the service

Click Deployments

Find the last working deployment

Click Rollback

Vercel
Go to Vercel Dashboard

Click the project

Click Deployments

Find the last working deployment

Click Redeploy

Last Updated: July 14, 2026