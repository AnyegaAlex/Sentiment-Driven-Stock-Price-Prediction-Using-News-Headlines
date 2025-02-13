# utils.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import torch
import logging

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize model and tokenizer once at module load
try:
    TOKENIZER = AutoTokenizer.from_pretrained("ProsusAI/finbert")
    MODEL = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
    logger.info("FinBERT model and tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Failed to load FinBERT model: {str(e)}")
    TOKENIZER = None
    MODEL = None

def analyze_sentiment(text):
    """
    Analyze financial text using FinBERT model with enhanced error handling and performance
    Returns: (sentiment_label, confidence_score)
    """
    # Validate input
    if not isinstance(text, str) or not text.strip():
        logger.warning("Empty or invalid text input received")
        return 'neutral', 0.0

    # Check model initialization
    if MODEL is None or TOKENIZER is None:
        logger.error("FinBERT model not available for sentiment analysis")
        return 'neutral', 0.0

    try:
        # Tokenize input
        inputs = TOKENIZER(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
            add_special_tokens=True
        )
        
        # Model inference
        with torch.no_grad():
            outputs = MODEL(**inputs)
        
        # Process results
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1).numpy()[0]
        labels = [MODEL.config.id2label[i].lower() for i in range(outputs.logits.shape[-1])]
        
        max_index = np.argmax(probabilities)
        confidence = float(probabilities[max_index])
        
        # Validate confidence threshold
        if confidence < 0.5:
            logger.debug(f"Low confidence sentiment detection: {confidence}")
        
        return labels[max_index], confidence
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed for text '{text[:50]}...': {str(e)}", exc_info=True)
        return 'neutral', 0.0