/**
 * Production-Ready Error Handler
 * 
 * Features:
 * - User-friendly error messages
 * - Error logging with context
 * - Error categorization
 * - Retry recommendations
 */

// ============================================================================
// Error Categories
// ============================================================================

export const ErrorCategory = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate_limit',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  PERMISSION: 'permission',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
};

// ============================================================================
// Error Messages by Category
// ============================================================================

const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Check your internet connection and try again.',
  },
  [ErrorCategory.AUTH]: {
    message: 'Please log in to continue.',
    action: 'Redirecting to login page...',
  },
  [ErrorCategory.VALIDATION]: {
    message: 'Please check your input and try again.',
    action: 'Review the form for errors.',
  },
  [ErrorCategory.RATE_LIMIT]: {
    message: 'Too many requests. Please wait a moment and try again.',
    action: 'Wait a few seconds before retrying.',
  },
  [ErrorCategory.NOT_FOUND]: {
    message: 'The requested resource was not found.',
    action: 'Please verify the URL or try again later.',
  },
  [ErrorCategory.SERVER]: {
    message: 'A server error occurred. Our team has been notified.',
    action: 'Please try again later.',
  },
  [ErrorCategory.PERMISSION]: {
    message: 'You do not have permission to perform this action.',
    action: 'Please contact support if you believe this is in error.',
  },
  [ErrorCategory.TIMEOUT]: {
    message: 'The request timed out. Please try again.',
    action: 'Check your connection and retry.',
  },
  [ErrorCategory.UNKNOWN]: {
    message: 'An unexpected error occurred.',
    action: 'Please try again or contact support.',
  },
};

// ============================================================================
// Error Handler// ============================================================================

export const handleApiError = (error, context = {}) => {
  // Extract error details
  const status = error.code || error.response?.status || 0;
  const message = error.message || error.response?.data?.message || '';
  const details = error.details || error.response?.data?.details || {};
  
  // Determine category
  let category = ErrorCategory.UNKNOWN;
  
  if (status === 0 || error.code === 'NETWORK_ERROR') {
    category = ErrorCategory.NETWORK;
  } else if (status === 401 || status === 403) {
    category = status === 401 ? ErrorCategory.AUTH : ErrorCategory.PERMISSION;
  } else if (status === 422) {
    category = ErrorCategory.VALIDATION;
  } else if (status === 429) {
    category = ErrorCategory.RATE_LIMIT;
  } else if (status === 404) {
    category = ErrorCategory.NOT_FOUND;
  } else if (status >= 500) {
    category = ErrorCategory.SERVER;
  } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    category = ErrorCategory.TIMEOUT;
  }

  // Get user-friendly message
  const errorInfo = ERROR_MESSAGES[category] || ERROR_MESSAGES[ErrorCategory.UNKNOWN];

  // Log error (with context)
  console.error('[Error Handler]', {
    category,
    status,
    message,
    details,
    context,
    timestamp: new Date().toISOString(),
  });

  // Return structured error
  return {
    category,
    status,
    userMessage: message || errorInfo.message,
    action: errorInfo.action,
    details,
    timestamp: new Date().toISOString(),
  };
};

// ============================================================================
// Error Display Helper
// ============================================================================

export const getErrorMessage = (error) => {
  const handled = handleApiError(error);
  return handled.userMessage;
};

export const getErrorAction = (error) => {
  const handled = handleApiError(error);
  return handled.action;
};

export const isAuthError = (error) => {
  const handled = handleApiError(error);
  return handled.category === ErrorCategory.AUTH;
};

export const isRetryableError = (error) => {
  const handled = handleApiError(error);
  return [
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER,
  ].includes(handled.category);
};

// ============================================================================
// React Hook for Error Handling
// ============================================================================

import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleError = useCallback((error, context = {}) => {
    const handled = handleApiError(error, context);
    setError(handled);
    setIsError(true);
    return handled;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  return {
    error,
    isError,
    handleError,
    clearError,
  };
};