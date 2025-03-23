
# Sentiment-Driven Stock Price Prediction Using News Headlines 📈

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Django](https://img.shields.io/badge/Django-4.2-brightgreen)
![Celery](https://img.shields.io/badge/Celery-5.3-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue)

## **Overview** 🔍
This project delivers a real-time stock sentiment analysis platform that leverages cutting-edge NLP and machine learning to predict stock price movements based on financial news headlines. It features automated, multi-source data pipelines that aggregate and deduplicate news from sources like Alpha Vantage, Yahoo Finance, and Finnhub. The system employs advanced sentiment analysis using FinBERT and spaCy to extract key insights, which are then integrated into an interactive dashboard for market monitoring. Designed to empower investors, the platform provides actionable, data-driven insights by correlating news sentiment with stock price trends—enabling smarter, more informed decision-making.

---


## **Key Features** 🚀

### **1. Automated News Aggregation & Processing**
- **Multi-Source Integration**: Seamlessly aggregates news from Alpha Vantage, Yahoo Finance, and Finnhub to ensure comprehensive market coverage.
- **Duplicate Detection**: Employs SHA-256 hashing for robust duplicate prevention, ensuring only unique articles are processed and stored.
- **Dynamic Filtering**: Enables filtering of news by publication date, sentiment, and source reliability to provide the most relevant insights.

### **2. Advanced Sentiment & Contextual Analysis**
- **FinBERT-Powered Sentiment Analysis**: Leverages FinBERT for accurate, context-aware sentiment classification, capturing the nuances of market sentiment.
- **Real-Time Confidence Scoring**: Provides a confidence score (ranging from 0 to 1) with every sentiment prediction, empowering users to gauge prediction reliability.
- **Key Phrase Extraction**: Uses spaCy to extract critical key phrases from news content, aiding quick content digestion and context understanding.
- **Historical Trend Visualization**: Visualizes sentiment trends over time to help track market mood shifts and forecast potential movements.

### **3. Interactive Predictive Dashboard**
- **Unified Dashboard Interface**: Combines market metrics, news analysis, and prediction history in one interactive view.
- **Dynamic Data Visualizations**: Features interactive charts (including dual-axis graphs) with sentiment overlays and trend analyses.
- **Custom Filtering & Real-Time Refresh**: Allows users to apply custom filters on news and refresh data dynamically to get the latest market insights.
- **Confidence & Reliability Indicators**: Highlights prediction confidence levels and news source reliability, ensuring informed decision-making.

### **4. Robust Enterprise-Grade Infrastructure**
- **Asynchronous Task Management**: Powered by Django and Celery for efficient, reliable background processing of news data and machine learning tasks.
- **Redis-Backed Task Queue & Bulk Database Operations**: Optimized for high-throughput operations, handling API rate limits, and ensuring performance via server-side caching.
- **Dockerized Deployment**: Facilitates easy setup, scaling, and consistent deployment across environments.

### **5. Training & Prediction Pipeline**
- **Efficient Data Ingestion & Preprocessing**: Utilizes Dask for memory-efficient data ingestion from Parquet files, ensuring scalable processing of historical news data.
- **Automated Model Training**: Trains a scikit-learn pipeline (featuring TF-IDF vectorization and Logistic Regression) to predict stock movements, complete with detailed performance evaluations (accuracy, precision, F1 score).
- **Model Persistence & Interactive Predictions**: Persists the trained model using Joblib and offers an interactive Gradio interface for real-time stock movement predictions.

### **6. Future Enhancements: AI-Driven Market Overviews**
- **Upcoming AI Overviews**: Planned integration of AI-generated summaries to provide market overviews and actionable insights, further enhancing the decision-making process by summarizing complex news narratives.

---
## **System Architecture** 🏗️
## Frontend Architecture
This section covers the user interface components built with React. The frontend is designed with a dashboard that displays market metrics (DashboardCards), a news analysis module (NewsAnalysis) that filters and presents news articles with key phrases and sentiment badges, and a prediction history component that visualizes past predictions. Routing and error handling are managed using React Router, React Query, and custom UI components.
### **Data Flow Diagram**
```mermaid
sequenceDiagram
    participant U as User
    participant H as Header (Symbol Selector & Navigation)
    participant D as Dashboard Page
    participant DC as DashboardCards Component
    participant NL as NewsList Component
    participant NA as News Analysis Page
    participant PH as Prediction History Page
    participant API as API Server
    participant EB as ErrorBoundary

    %% --- Dashboard Tab Flow ---
    U->>H: Select stock symbol (via dropdown)
    H->>D: Route to Dashboard tab with selected symbol
    D->>DC: Render DashboardCards (market metrics)
    DC->>API: Request news data (async)
    par Show loading spinner
       DC->>U: Display loading indicator
    end
    API-->>DC: Return news data (cached/fresh)
    DC->>U: Display market metrics above news list
    D->>NL: Render NewsList (news articles with filtering & key phrases)
    NL->>API: Request news data for {selectedSymbol} (async)
    par Display skeleton loading
       NL->>U: Show loading state
    end
    API-->>NL: Return news data
    NL->>NL: Filter news by sentiment (via Select dropdown)
    NL->>NL: Toggle key phrases expansion on click
    NL->>U: Render news cards with images, metadata, sentiment icons, & key phrases

    %% --- News Analysis Page Flow ---
    U->>H: Navigate to News Analysis tab
    H->>NA: Route to News Analysis Page with symbol parameter
    NA->>API: Request detailed news analysis data (async)
    par Show loading indicator
       NA->>U: Display loading state
    end
    API-->>NA: Return detailed news analysis data
    NA->>U: Render interactive news analysis view (filters, key phrase expansion, etc.)

    %% --- Prediction History Page Flow ---
    U->>H: Navigate to Prediction History tab
    H->>PH: Route to Prediction History Page
    PH->>API: Request prediction history data (async)
    par Show chart loading indicator
       PH->>U: Display loading spinner for prediction chart
    end
    API-->>PH: Return prediction history data
    PH->>U: Render dual-axis prediction chart and modal for detailed analysis
    PH->>U: Allow user to click "View Detailed Analysis" to open modal

    %% --- Refresh Flow (applies to all tabs) ---
    U->>D: Click refresh button
    D->>API: Force new fetch of news data (async)
```
## Backend Architecture
The backend is powered by Django and Celery for asynchronous tasks. It fetches news data from external APIs (Alpha Vantage, Finnhub, Yahoo Finance), processes the articles (normalization, deduplication, sentiment analysis, key phrase extraction, and source reliability assessment), and stores the results in a server‑side cache (Django DB). Robust error handling and retry mechanisms ensure the system’s resilience.
```mermaid
flowchart TD
    A["Start: fetch_and_process_news Task"]
    B["Check DB Cache for Recent Articles<br>last 24 hrs"]
    C{"Cached Articles Exist?"}
    D["Return cached articles info<br>(new_articles=0, duplicates=count)"]
    E["Fetch articles from APIs"]
    F["Loop Over Providers:<br>Alpha Vantage, Finnhub, Yahoo Finance"]
    G{"Successful Fetch?"}
    H["Set articles and break loop"]
    I["Log error and try next provider"]
    J{"Articles Found?"}
    K["Log error and return error message"]
    L["Optional: Filter Articles<br>last 24 hrs"]
    M["Process Articles: _process_articles"]
    
    subgraph Deduplication [Article Deduplication]
        N["Deduplicate Articles In-Memory<br>(normalize title, parse date, compute hash)"]
    end
    
    subgraph Processing [Process Each Article]
        O["For Each Deduplicated Article"]
        P["Normalize Title & Parse Date"]
        Q["Compute Unique Hash<br>(using rounded timestamp)"]
        R["Prepare Content<br>Combine title and summary"]
        S["Analyze Sentiment<br>(using FINBERT)"]
        T["Extract Key Phrases<br>(using spaCy)"]
        U["Determine Source Reliability"]
        V["Update/Create DB Record<br>(with transaction.atomic)"]
        W{"Record Created?"}
        X["Increment new_articles count"]
        Y["Increment duplicate_count"]
    end
    
    Z["Process Next Article"]
    AA["All Articles Processed"]
    AB["Write Processing Log"]
    AC["Return Success Message with Counts"]
    AD["End Task"]
    
    A --> B
    B --> C
    C -- "Yes" --> D
    C -- "No" --> E
    E --> F
    F --> G
    G -- "Yes" --> H
    G -- "No" --> I
    I --> F
    H --> J
    J -- "No" --> K
    J -- "Yes" --> L
    L --> M
    M --> N
    N --> O
    O --> P
    P --> Q
    Q --> R
    R --> S
    S --> T
    T --> U
    U --> V
    V --> W
    W -- "Yes" --> X
    W -- "No" --> Y
    X & Y --> Z
    Z --> AA
    AA --> AB
    AB --> AC
    AC --> AD
    
    %% Error Handling for API Fetch
    I --- AE["Handle API errors and retry if rate-limited"]
    AE --- F
```

## Training & Prediction Pipeline
This section details the machine learning pipeline that processes historical news data for training. It uses Dask for efficient data ingestion from Parquet files, performs batch sentiment analysis with FinBERT, and trains a scikit‑learn pipeline (utilizing TF‑IDF for feature extraction and Logistic Regression for classification) to predict stock movements. The trained model is persisted using Joblib and can be accessed via a Gradio interface for interactive predictions.
```mermaid
flowchart TD
    A["Start: Training Pipeline"]
    B["Load Historical Data<br>(from Parquet using Dask)"]
    C["Preprocess Data<br>(batch sentiment analysis with FinBERT)"]
    D["Split Data<br>(Train/Validation/Test)"]
    E["Define ML Pipeline<br>(TF-IDF & Logistic Regression)"]
    F["Train Model"]
    G["Evaluate Model<br>(Accuracy, Precision, F1)"]
    H["Persist Trained Model<br>(using Joblib)"]
    I["Launch Prediction Interface<br>(Gradio)"]
    J["End Training Pipeline"]
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
```
## Sequence Diagrams
This combined sequence diagram illustrates the end‑to‑end flow of the application. It details how the frontend components (Dashboard with DashboardCards and NewsList, News Analysis page, Prediction History page) interact with the backend API for news processing, and how the training pipeline feeds into the prediction endpoint. This overview helps visualize the complete system architecture and data flow.
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Dashboard/NewsAnalysis/PredictionHistory)
    participant API as API Server (Celery Task)
    participant DB as Server-side Cache (ProcessedNews)
    participant EXT as External News APIs
    participant EH as Error Handler
    participant TP as Training Pipeline
    participant MODEL as Trained Model (Persisted via Joblib)
    
    %% Frontend News Fetch Flow
    U->>FE: Select stock symbol & navigate to Dashboard
    FE->>API: Request news data (async)
    API->>DB: Check cache for recent news
    alt Cache Hit
        DB-->>API: Return cached news
    else Cache Miss
        API->>EXT: Fetch news from external APIs
        EXT-->>API: Return raw news data
        API->>API: Process articles (normalization, deduplication, sentiment analysis,<br/>key phrase extraction, source reliability)
        API->>DB: Store processed articles
    end
    API-->>FE: Return processed news data
    FE->>U: Display Dashboard with DashboardCards & NewsList
    
    %% Frontend Prediction Flow
    U->>FE: Navigate to Prediction History tab
    FE->>TP: Request prediction history data (async)
    TP->>MODEL: Retrieve predictions
    MODEL-->>TP: Return prediction results
    TP-->>FE: Return prediction history data
    FE->>U: Display Prediction History (chart & modal)
    
    %% Error Handling
    API-->>EH: Forward errors (e.g., rate limiting)
    EH-->>API: Error handled & retried
```
## API Endpoints 🌐

### 1. Symbol Search
Search for stock symbols using Alpha Vantage or Yahoo Finance as fallback.

#### Endpoint:
``` http
GET /api/news/symbol-search/?q=Apple
```
#### Parameters:
- *q (required): The search query (e.g., "Apple")*
#### Response:
```json
HTTP 200 OK
Allow: OPTIONS, GET
Content-Type: application/json
Vary: Accept
[
    {
        "1. symbol": "APLE",
        "2. name": "Apple Hospitality REIT Inc",
        "3. type": "Equity",
        "4. region": "United States",
        "5. marketOpen": "09:30",
        "6. marketClose": "16:00",
        "7. timezone": "UTC-04",
        "8. currency": "USD",
        "9. matchScore": "0.8889"
    },
```
### 2. Get Analyzed News
Retrieve analyzed news for a stock symbol. Steps:

    1. Check the database cache.
    2. Attempt to fetch from Alpha Vantage.
    3. Fallback to Finnhub, then Yahoo Finance if needed.
    4. Standardize and analyze each article, save it, and return the data.

#### Endpoint:
```http
GET /api/news/analyzed/
```
#### Parameters:
- ```symbol``` (required): The stock symbol (e.g., "AAPL").
- ```refresh``` (optional): Force a refresh of the data (default: ```false```).

#### Response:
```json
HTTP 200 OK
Allow: OPTIONS, GET
Content-Type: application/json
Vary: Accept

{
    "symbol": "IBM",
    "news": [
        {
            "title": "Seagate Inks Deal to Acquire Intevac in $119 Million All-Cash Deal",
            "summary": "STX will buy Intevac for $4.00 per share in an all-cash transaction. The buyout is expected to close by late March or early April 2025.",
            "source": "Zacks Commentary",
            "published_at": "2025-02-14T14:56:00Z",
            "sentiment": "neutral",
            "confidence": 0.904671311378479
        },
```
### 3. Get News
Retrieve processed news for a given stock symbol. If a refresh is requested or no processed news exists, trigger an asynchronous task.

#### Endpoint:

```http
GET /api/news/get-news/
```
#### Parameters:
- ```symbol``` (required): The stock symbol (e.g., "AAPL").
- ```refresh``` (optional): Force a refresh of the data (default: ```false```).

#### Response:
```json
HTTP 200 OK
Allow: OPTIONS, GET
Content-Type: application/json
Vary: Accept

{
    "symbol": "IBM",
    "news": [
        {
            "title": "Seagate Inks Deal to Acquire Intevac in $119 Million All-Cash Deal",
            "summary": "STX will buy Intevac for $4.00 per share in an all-cash transaction. The buyout is expected to close by late March or early April 2025.",
            "source": "Zacks Commentary",
            "published_at": "2025-02-14T14:56:00Z",
            "sentiment": "neutral",
            "confidence": 0.904671311378479
        },
```
## Installation (Manual Setup) ⚙️
### Backend:
```bash
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt

cd sentiment_driven_stock_price_prediction_engine
python manage.py runserver
```

### Frontend:
```bash
cd .venv
Scripts/activate

cd frontend
npm install
npm run dev
```

### Start Services:
```bash
redis-server
celery -A sentiment_driven_stock_price_prediction_engine worker --pool=solo --loglevel=info
python manage.py runserver
npm run dev
```

### Environment Variables (.env)
```
//Backend (.env)//

NEWS_API_KEY=
ALPHA_VANTAGE_KEY=
FINNHUB_API_KEY=
RAPIDAPI_KEY=
RAPIDAPI_HOST=
DB_NAME=stock_analysis
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
CELERY_BROKER_URL=

//Frontend (.env)//

VITE_ALPHA_VANTAGE_KEY=
VITE_RAPIDAPI_KEY=
VITE_RAPIDAPI_HOST=
REACT_APP_API_BASE_URL=

```

## Contributing

We welcome contributions to improve this project! Follow these steps to get started:

1. **Fork the Repository:** Create your own copy of the project.
2. **Create a Feature Branch:** Branch off from the latest version of `main`.
3. **Implement Your Changes:** 
   - Add new features or bug fixes.
   - Include comprehensive test coverage.
   - Update the documentation as needed.
   - Ensure proper type annotations are added.
4. **Submit a Pull Request (PR):** Clearly describe your changes and the issues they address.

By contributing, you agree to adhere to our Code of Conduct to ensure a respectful and collaborative environment for everyone.

## License 📄

MIT License - See [LICENSE](https://choosealicense.com/licenses/mit/)for details.
