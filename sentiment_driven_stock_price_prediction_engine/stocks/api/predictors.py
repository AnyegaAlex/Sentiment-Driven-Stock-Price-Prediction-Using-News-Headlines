import joblib
import numpy as np
from django.conf import settings
from django.core.cache import caches
from transformers import pipeline
from ..models import PredictionRecord

cache = caches['predictions']

class StockPredictor:
    def __init__(self):
        self.model = joblib.load(settings.MODEL_PATH)
        self.sentiment_analyzer = pipeline(
            "text-classification",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1
        )
        self.hf_fallback = HuggingFaceFallback()

    def predict(self, news_text, user=None):
        cache_key = f"pred:{hash(news_text)}"
        cached = cache.get(cache_key)
        
        if cached:
            return self._create_record(cached, user, cached=True)

        try:
            features = self._extract_features(news_text)
            prediction = self.model.predict([features])[0]
            proba = self.model.predict_proba([features])[0]
            
            record_data = {
                'prediction': 'UP' if prediction == 1 else 'DOWN',
                'confidence': max(proba),
                'sentiment_score': features['sentiment'],
                'features': features,
                'model_version': settings.MODEL_VERSION
            }
            
            cache.set(cache_key, record_data, 3600)
            return self._create_record(record_data, user)
            
        except Exception as e:
            return self.hf_fallback.predict(news_text, user)

    def _extract_features(self, text):
        truncated = str(text)[:512]
        sentiment = self.sentiment_analyzer(truncated)[0]
        return {
            'sentiment': sentiment['score'] * (1 if sentiment['label'] == 'POSITIVE' else -1),
            # Add other features from your model
        }

    def _create_record(self, data, user, cached=False):
        return PredictionRecord.objects.create(
            user=user,
            news_text=data.get('news_text', ''),
            prediction=data['prediction'],
            confidence=data['confidence'],
            sentiment_score=data['sentiment_score'],
            features=data['features'],
            model_version=data.get('model_version', 'unknown'),
            source='local' if not cached else 'cache'
        )

class HuggingFaceFallback:
    def predict(self, news_text, user):
        try:
            # Implement Hugging Face Inference API call
            response = requests.post(
                settings.HF_API_ENDPOINT,
                json={"inputs": news_text},
                headers={"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
            )
            return self._parse_hf_response(response.json(), news_text, user)
        except Exception as e:
            raise PredictionError("All prediction services are unavailable")

    def _parse_hf_response(self, response, text, user):
        # Parse HF API response to match local format
        return PredictionRecord.objects.create(
            user=user,
            news_text=text,
            prediction=response['prediction'],
            confidence=response['confidence'],
            sentiment_score=response['sentiment'],
            features=response.get('features', {}),
            model_version=response.get('model_version', 'hf_fallback'),
            source='hf'
        )