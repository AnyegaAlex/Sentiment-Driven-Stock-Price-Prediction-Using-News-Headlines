import os
import re
import logging
import datetime
import numpy as np
import pandas as pd
import yfinance as yf
import requests
import textwrap
from typing import List, Dict, Any, Optional, Tuple
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv
from functools import lru_cache
from celery import shared_task
from django.db import transaction
from .models import StockOpinion

load_dotenv()

# Configuration and session setup
def create_retry_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

session = create_retry_session()

# Rest of your AnalysisEngine class and functions go here...
# [Keep all the existing AnalysisEngine code from your original file]