export const APP_NAME = 'Tickflow Sentiment';
export const COMPANY_NAME = 'Tickflow Capital';
export const TAGLINE = 'AI-Powered Financial News Intelligence';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const PERSONAS = {
  TRADER: 'trader',
  RESEARCHER: 'researcher',
  DEVELOPER: 'developer',
  ANALYST: 'analyst',
  STUDENT: 'student',
};

export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  ONBOARDING_COMPLETE: 'onboardingComplete',
};