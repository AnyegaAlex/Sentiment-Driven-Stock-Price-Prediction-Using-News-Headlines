import torch
import torch.nn.functional as F
from transformers import BertTokenizer, BertForSequenceClassification
from huggingface_hub import login
from dotenv import load_dotenv
import os

# Load environment variables from the .env file f
load_dotenv()

# Access the token from environment variables
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")

if ACCESS_TOKEN is None:
    raise ValueError("ACCESS_TOKEN is not set in the environment variables.")

# Authenticate
login(ACCESS_TOKEN)

# Load FinBERT with authentication
MODEL_PATH = "ProsusAI/finbert"
tokenizer = BertTokenizer.from_pretrained(MODEL_PATH, token=ACCESS_TOKEN)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH, token=ACCESS_TOKEN)

print("✅ FinBERT model loaded successfully!")

# Sample news headlines to test
headlines = [
    "Stock market crashes due to economic downturn.",
    "Tech stocks soar as investors gain confidence.",
    "The Federal Reserve keeps interest rates unchanged."
]

# Perform sentiment analysis
model.eval()
for text in headlines:
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1)
        sentiment = ["negative", "neutral", "positive"][torch.argmax(probs).item()]
    
    print(f"\n📰 Headline: {text}\n🔍 Sentiment: {sentiment}")
