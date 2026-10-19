# news/services/__init__.py
from .ingestion import IngestionService
from .providers import ProviderManager

__all__ = ['IngestionService', 'ProviderManager']