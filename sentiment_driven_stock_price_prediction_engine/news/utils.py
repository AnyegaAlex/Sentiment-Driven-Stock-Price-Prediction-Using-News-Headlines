from nltk.sentiment import SentimentIntensityAnalyzer
import nltk
nltk.download('vader_lexicon')

def analyze_sentiment(headline):
    sia = SentimentIntensityAnalyzer()
    sentiment = sia.polarity_scores(headline)
    return sentiment['compound']  # Returns a score between -1 (negative) and 1 (positive)