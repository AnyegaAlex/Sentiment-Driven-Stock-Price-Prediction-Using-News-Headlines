# Sentiment-Driven Stock Price Prediction Using News Headlines

## **Overview**

Stock prices are significantly influenced by market sentiment, which is often shaped by news headlines and media narratives. This project leverages machine learning and natural language processing (NLP) to predict stock price movement (increase or decrease) based on the sentiment of financial news headlines. The tool provides investors with a data-driven way to make informed decisions quickly and efficiently.

---

## **Features**

1. **Sentiment Analysis**: Classifies financial news headlines as positive, negative, or neutral.
2. **Stock Price Movement Prediction**: Predicts whether stock prices will increase or decrease based on sentiment and historical data.
3. **Interactive Dashboard**:
    - Visualizes sentiment trends over time.
    - Displays stock predictions alongside historical data.
    - Provides actionable insights through graphs and charts.
4. **Real-Time Data Integration**: Fetches financial news and stock data using APIs like NewsAPI and Alpha Vantage.
5. **Scalable Design**: Designed to handle large datasets and real-time data streams efficiently.

---

## **Tech Stack**

- **Backend**: Django, Django REST Framework
- **Frontend**: Django templates
- **Machine Learning**: Scikit-learn, TensorFlow/Keras
- **APIs**: NewsAPI, Alpha Vantage
- **Database**: PostgreSQL
- **Task Queue**: Celery with Redis
- **Visualization**: Plotly/D3.js for the dashboard

---

## **Project Structure**

```
├── stock_sentiment_engine/
│   ├── api/              # REST API endpoints
│   ├── frontend/         # Frontend for visualization
│   ├── analysis/         # NLP and sentiment analysis
|   ├── data_ingest /     # All data-fetching tasks.
│   ├── static/           # Static files for the frontend
│   ├── templates/        # HTML templates
│   └── tests/            # Unit and integration tests
└── README.md

```

## **Data Sources**

**Financial News:**
API: NewsAPI
Example Data:

```
{
    "headline": "Tech stocks rally as inflation fears ease",
    "date": "2024-01-07",
    "source": "Reuters"
}

```

**Stock Data:**
API: Alpha Vantage
Example Data:

```
{
    "symbol": "AAPL",
    "date": "2024-01-07",
    "close": 179.45,
    "open": 175.90
}

```

## **Installation Guide**

**Clone the Repository:**

```
git clone <https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines.git>
cd stock_sentiment_engine

```

**Set Up Virtual Environment:**

```
python -m venv .venv
source venv/bin/activate  # Linux/Mac
.venv\\Scripts\\activate     # Windows

```

**Install Dependencies:**

```
pip install -r requirements.txt

```

**Set Up Environment Variables: Create a .env file and add the following:**

```
NEWS_API_KEY=your_newsapi_key
ALPHA_VANTAGE_KEY=your_alphavantage_key
SECRET_KEY=your_django_secret_key

```

**Run Migrations:**

```
python manage.py makemigrations
python manage.py migrate

```

**Start the Server:**

```
python manage.py runserver

```

Access the Dashboard: Visit [http://127.0.0.1:8000](http://127.0.0.1:8000/) in your browser.

## **Usage**

**Fetching Data:**
Use the fetch_data management command to fetch news and stock data:

```
python manage.py fetch_data

```

**Making Predictions:**
The model predicts stock price movement based on the sentiment score and displays the results on the dashboard.
**Example Workflow:**
Enter a stock symbol (e.g., AAPL) in the dashboard.
View sentiment trends and predictions in real-time.

## **Model Details**

**Sentiment Analysis:**

- Preprocessed headlines using tokenization, lemmatization, and stopword removal.
- Sentiment classification using a pre-trained model (e.g., BERT or logistic regression).
**Prediction Model:**
- **Input:** Sentiment scores, stock open/close prices, volume, and other technical indicators.
- **Algorithm:** Random Forest, Gradient Boosting, or LSTM.
**Evaluation Metrics:** Accuracy, precision, recall, F1-score.

## **Testing**

**Unit Tests:**
Run tests for APIs, ML models, and data pipelines:

```
python manage.py test

```

**Validation:**
Validate predictions using historical stock data to ensure reliability.

## **Performance Metrics**

**Sentiment Classification:**

- Accuracy: 85%
- F1-Score: 0.83

**Stock Movement Prediction:**

- Accuracy: 78%
- Precision: 0.80
- Recall: 0.76

## **Features Under Development**

- Multi-language support for sentiment analysis.
- Advanced visualization tools for user engagement.
- Support for more data sources like Twitter and Reddit.

## **Contributing**

Fork the repository.
**Create a feature branch:**

```
git checkout -b feature-name

```

**Commit your changes:**

```
git commit -m "Added new feature"

```

**Push the branch:**

```
git push origin feature-name

```

Open a pull request.

## **License**

This project is licensed under the MIT License. See the LICENSE file for details.

## **Project Screenshots**

## **Live Demo**

Live Demo Link

## **Contact**

For questions or feedback, contact us at [anyega.alex.kamau@gmail.com](mailto:anyega.alex.kamau@gmail.com)
