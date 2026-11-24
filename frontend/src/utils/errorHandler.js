import { useCallback, useState } from 'react';
import { captureException } from '@/sentry';

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

const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    message: 'We can’t reach TickFlow right now. Check your internet connection and try again.',
    action: 'Check your connection, then try again.',
  },
  [ErrorCategory.AUTH]: {
    message: 'Your session has expired. Sign in again to continue.',
    action: 'Sign in again to continue.',
  },
  [ErrorCategory.VALIDATION]: {
    message: 'Some of the information needs attention. Review the form and try again.',
    action: 'Review the information you entered.',
  },
  [ErrorCategory.RATE_LIMIT]: {
    message: 'You’ve made several requests in a short time. Wait a moment, then try again.',
    action: 'Wait before trying again.',
  },
  [ErrorCategory.NOT_FOUND]: {
    message: 'We couldn’t find the requested information.',
    action: 'Check the ticker or address and try again.',
  },
  [ErrorCategory.SERVER]: {
    message: 'TickFlow couldn’t complete that request because of a server problem.',
    action: 'Try again shortly.',
  },
  [ErrorCategory.PERMISSION]: {
    message: 'You don’t have permission to perform this action.',
    action: 'Check your account access.',
  },
  [ErrorCategory.TIMEOUT]: {
    message: 'The request took too long to complete. Try again.',
    action: 'Check your connection and retry.',
  },
  [ErrorCategory.UNKNOWN]: {
    message: 'Something unexpected happened. Please try again.',
    action: 'Try again. If the problem continues, report it through the project repository.',
  },
};

const numericStatus = (error) => {
  const value = Number(error?.code ?? error?.response?.status ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const firstMessage = (value) => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
    return '';
  }
  if (value && typeof value === 'object') {
    for (const key of ['detail', 'message', 'error', 'non_field_errors']) {
      const message = firstMessage(value[key]);
      if (message) return message;
    }
    for (const nested of Object.values(value)) {
      const message = firstMessage(nested);
      if (message) return message;
    }
  }
  return '';
};

const getServiceCode = (error) => Number(
  error?.serviceCode ??
  error?.details?.code ??
  error?.response?.data?.code ??
  error?.response?.data?.error_code
);

const isHttpStatusMessage = (message) => /^request failed with status code \d+$/i.test(message);

const isGenericValidationMessage = (message) => (
  ['validation failed', 'invalid request', 'bad request', 'validation error'].includes(
    message.toLowerCase()
  )
);

/**
 * Turn the flattened API-client error shape into safe, actionable copy.
 * Field-level backend validation messages are preserved when available.
 */
export const getActionErrorMessage = (
  error,
  fallback = 'We couldn’t complete that action. Please try again.'
) => {
  const status = numericStatus(error);
  const serviceCode = getServiceCode(error);
  const rawMessage = firstMessage(error?.message);
  const responseData = error?.response?.data;
  const responseMessage = firstMessage(responseData);
  const message = isHttpStatusMessage(rawMessage)
    ? responseMessage
    : rawMessage || responseMessage;
  const detailMessage = firstMessage(error?.details) ||
    firstMessage(responseData?.details) ||
    firstMessage(responseData?.errors);

  if (serviceCode === 5030) {
    return 'News analysis is not available for this account yet. You can continue using the rest of your workspace.';
  }
  if (serviceCode === 5031) {
    return 'Market-data analysis is not available for this account yet. Other workspace features remain available.';
  }
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) || status === 408) {
    return 'The request took too long. Check your connection and try again.';
  }
  if (
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'ERR_NETWORK' ||
    (status === 0 && !error?.response)
  ) {
    return 'We can’t reach TickFlow right now. Check your internet connection and try again.';
  }
  if (status === 401) return 'Your session has expired. Sign in again to continue.';
  if (status === 403) return 'You don’t have permission to make this change.';
  if (status === 404) return 'We couldn’t find the requested account information.';
  if (status === 409) return message || 'This change conflicts with information already on your account.';
  if (status === 429) {
    const retryAfter = Number(error?.retryAfter);
    return retryAfter > 0
      ? 'Please wait ' + retryAfter + ' seconds before trying again.'
      : 'You’ve made several requests in a short time. Wait a moment, then try again.';
  }
  if (status === 503) {
    return 'This service is temporarily unavailable. Your other workspace features may still work.';
  }
  if (status >= 500) {
    return 'TickFlow couldn’t complete that request because of a server problem. Please try again shortly.';
  }
  if (status === 400 || status === 422) {
    if (detailMessage) return detailMessage;
    if (message && !isGenericValidationMessage(message)) return message;
    return 'Some of the information needs attention. Review the form and try again.';
  }

  return message || detailMessage || fallback;
};

export const handleApiError = (error, context = {}) => {
  const status = numericStatus(error);
  const message = firstMessage(error?.message) || firstMessage(error?.response?.data);
  const details = error?.details ?? error?.response?.data?.details ?? {};
  let category = ErrorCategory.UNKNOWN;

  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) || status === 408) {
    category = ErrorCategory.TIMEOUT;
  } else if (error?.code === 'NETWORK_ERROR' || (!status && !error?.response)) {
    category = ErrorCategory.NETWORK;
  } else if (status === 401) {
    category = ErrorCategory.AUTH;
  } else if (status === 403) {
    category = ErrorCategory.PERMISSION;
  } else if (status === 400 || status === 422) {
    category = ErrorCategory.VALIDATION;
  } else if (status === 429) {
    category = ErrorCategory.RATE_LIMIT;
  } else if (status === 404) {
    category = ErrorCategory.NOT_FOUND;
  } else if (status >= 500) {
    category = ErrorCategory.SERVER;
  }

  if ([ErrorCategory.NETWORK, ErrorCategory.SERVER, ErrorCategory.UNKNOWN].includes(category)) {
    const exception = error instanceof Error ? error : new Error(message || 'API request failed');
    captureException(exception, {
      category,
      status,
      area: typeof context.area === 'string' ? context.area : undefined,
    });
  }

  return {
    category,
    status,
    userMessage: getActionErrorMessage(error, ERROR_MESSAGES[category].message),
    action: ERROR_MESSAGES[category].action,
    details,
    timestamp: new Date().toISOString(),
  };
};

export const getErrorMessage = (error) => handleApiError(error).userMessage;
export const getErrorAction = (error) => handleApiError(error).action;
export const isAuthError = (error) => handleApiError(error).category === ErrorCategory.AUTH;
export const isRetryableError = (error) => [
  ErrorCategory.NETWORK,
  ErrorCategory.TIMEOUT,
  ErrorCategory.RATE_LIMIT,
  ErrorCategory.SERVER,
].includes(handleApiError(error).category);

export const getCardErrorMessage = (error) => {
  const status = numericStatus(error);
  const serviceCode = getServiceCode(error);

  if (serviceCode === 5030) {
    return 'News analysis is not available for this account yet. You can continue using the rest of your workspace.';
  }
  if (serviceCode === 5031) {
    return 'Market-data analysis is not available for this account yet. Other workspace features remain available.';
  }
  if (error?.code === 'NETWORK_ERROR') {
    return 'We can’t reach TickFlow right now. Check your internet connection and try again.';
  }
  if (status === 401) return 'Your session has expired. Sign in again to continue.';
  if (status === 403) return 'You don’t have access to this information.';
  if (status === 404) return 'We couldn’t find data for this symbol. Check the ticker and try again.';
  if (status === 429) return getActionErrorMessage(error);
  if (status === 503) return 'This service is temporarily unavailable. Please try again shortly.';
  if (status >= 500) return 'We couldn’t load this information because of a server problem. Please try again shortly.';
  return getActionErrorMessage(error, 'We couldn’t load this information. Please try again.');
};

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleError = useCallback((requestError, context = {}) => {
    const handled = handleApiError(requestError, context);
    setError(handled);
    setIsError(true);
    return handled;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  return { error, isError, handleError, clearError };
};
