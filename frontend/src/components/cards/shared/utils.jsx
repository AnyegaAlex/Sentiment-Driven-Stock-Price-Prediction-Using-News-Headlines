/**
 * Shared utilities for stock analysis cards
 * Centralizes common functions, constants, and configurations to ensure
 * design consistency, type safety, and maintainability across the application.
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} ColorSchemeConfig
 * @property {string} bg - Background utility classes
 * @property {string} border - Border utility classes
 * @property {string} text - Text color utility classes
 * @property {string} badge - Badge utility classes
 * @property {string} chart - Chart RGB color string
 * @property {string} chartBg - Chart background RGBA color string
 * @property {string} gradient - Tailwind gradient utility classes
 * @property {string} hover - Hover state utility classes
 */

/**
 * @typedef {Object} RSIStatus
 * @property {string} label - Human-readable RSI status
 * @property {ColorSchemeConfig} color - Associated color scheme
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * @type {Readonly<{ positive: ColorSchemeConfig, negative: ColorSchemeConfig, neutral: ColorSchemeConfig, warning: ColorSchemeConfig }>}
 */
export const COLOR_SCHEMES = Object.freeze({
  positive: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
    chart: 'rgb(16, 185, 129)',
    chartBg: 'rgba(16, 185, 129, 0.15)',
    gradient: 'from-emerald-400 to-emerald-600',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
  },
  negative: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/30',
    text: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700',
    chart: 'rgb(244, 63, 94)',
    chartBg: 'rgba(244, 63, 94, 0.15)',
    gradient: 'from-rose-400 to-rose-600',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-950/20',
  },
  neutral: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/30',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    chart: 'rgb(59, 130, 246)',
    chartBg: 'rgba(59, 130, 246, 0.15)',
    gradient: 'from-blue-400 to-blue-600',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/20',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/30',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    chart: 'rgb(245, 158, 11)',
    chartBg: 'rgba(245, 158, 11, 0.15)',
    gradient: 'from-amber-400 to-amber-600',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/20',
  },
});

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Formats a numeric volume into a human-readable string (e.g., 1.5M, 2.3B).
 * @param {number|string} volume - The volume to format
 * @returns {string} Formatted volume string or '—' for invalid input
 */
export const formatVolume = (volume) => {
  const safe = Number(volume);
  if (!Number.isFinite(safe) || safe <= 0) return '—';
  if (safe >= 1e9) return `${(safe / 1e9).toFixed(1)}B`;
  if (safe >= 1e6) return `${(safe / 1e6).toFixed(1)}M`;
  if (safe >= 1e3) return `${(safe / 1e3).toFixed(1)}K`;
  return String(safe);
};

/**
 * Formats a date string into a localized date string.
 * @param {string|number|Date} dateString - The date to format
 * @param {string} [locales='en-US'] - The locale to use
 * @param {Intl.DateTimeFormatOptions} [options={}] - Formatting options
 * @returns {string} Formatted date string or 'N/A'
 */
export const formatDate = (dateString, locales = 'en-US', options = {}) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString(locales, options);
  } catch {
    return 'N/A';
  }
};

/**
 * Formats a numeric value as a percentage with an explicit sign.
 * @param {number|null|undefined} value - The value to format
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage string or 'N/A'
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// ============================================================================
// Calculation Utilities
// ============================================================================

/**
 * Calculates the standard deviation (volatility) of an array of sentiment scores.
 * @param {Array<Object>} history - Array of objects containing a 'score' property
 * @returns {number} Volatility percentage, or 0 if insufficient data
 */
export const calculateVolatility = (history) => {
  if (!Array.isArray(history) || history.length < 2) return 0;
  
  const scores = history
    .map((item) => Number(item?.score))
    .filter((value) => Number.isFinite(value));
    
  if (scores.length < 2) return 0;
  
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance = scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
  
  return Math.sqrt(variance) * 100;
};

/**
 * Calculates a reliability score based on tier 1 source counts and reliability sum.
 * @param {Object} stats - Statistics object containing reliability_sum and tier1_count
 * @returns {number} Reliability percentage (0-100)
 */
export const calculateReliabilityScore = (stats) => {
  if (!stats || !stats.reliability_sum || !stats.tier1_count) return 0;
  return Math.min(100, Math.max(0, Math.round((stats.reliability_sum / stats.tier1_count) * 100)));
};

/**
 * Determines the RSI status and associated color scheme.
 * @param {number} rsi - The Relative Strength Index value
 * @returns {RSIStatus} Object containing label and color scheme
 */
export const getRSIStatus = (rsi) => {
  if (rsi >= 70) return { label: 'Overbought', color: COLOR_SCHEMES.negative };
  if (rsi <= 30) return { label: 'Oversold', color: COLOR_SCHEMES.positive };
  return { label: 'Neutral', color: COLOR_SCHEMES.neutral };
};

// ============================================================================
// Time Range Utilities
// ============================================================================

/**
 * Converts a time range string to the equivalent number of days.
 * @param {string} range - Time range identifier (e.g., '7d', '30d')
 * @returns {number} Number of days
 */
export const getTimeRangeDays = (range) => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '1m': return 30;
    case '3m': return 90;
    case '1w': return 7;
    case '1d': return 1;
    default: return 7;
  }
};

// ============================================================================
// Chart Utilities
// ============================================================================

/**
 * Generates responsive Chart.js configuration options.
 * @param {number} width - Current container width in pixels
 * @param {Object} [customOptions={}] - Overrides for default options
 * @returns {Object} Chart.js options object
 */
export const getChartOptions = (width, customOptions = {}) => {
  const isMobile = width < 640;
  const fontSize = isMobile ? 10 : 12;
  const tooltipFontSize = isMobile ? 12 : 14;

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6b7280',
          usePointStyle: true,
          boxWidth: 10,
          font: { size: isMobile ? 11 : 13 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        padding: isMobile ? 8 : 12,
        bodyFont: { size: tooltipFontSize },
        titleFont: { size: tooltipFontSize + 1 },
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(75, 85, 99, 0.15)' },
        ticks: {
          color: '#6b7280',
          font: { size: fontSize },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          font: { size: fontSize },
          maxRotation: isMobile ? 45 : 30,
          minRotation: isMobile ? 45 : 30,
        },
      },
    },
    ...customOptions,
  };
};

// ============================================================================
// Shared Components
// ============================================================================

/**
 * Wrapper component providing consistent card styling, shadows, and max-width constraints.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const CardWrapper = ({ children, className }) => (
  <Card
    className={cn(
      'relative overflow-hidden border-gray-200 bg-white transition-shadow duration-300 dark:border-gray-800 dark:bg-gray-900',
      'shadow-lg hover:shadow-xl',
      'mx-auto w-full max-w-6xl',
      className
    )}
  >
    {children}
  </Card>
);

CardWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Skeleton wrapper for consistent loading states.
 * @param {Object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children]
 */
export const CardSkeleton = ({ className, children }) => (
  <Card className={cn('border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
    {children}
  </Card>
);

CardSkeleton.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

/**
 * Standardized error state component with retry functionality.
 * @param {Object} props
 * @param {string|Error} props.error - The error object or message
 * @param {function} props.onRetry - Callback to execute on retry
 * @param {string} [props.className]
 * @param {string} [props.title='Error Loading Data']
 */
export const CardError = ({ error, onRetry, className, title = 'Error Loading Data' }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  const errorMessage = useMemo(() => {
    if (typeof error === 'string') return error;
    return error?.message || 'An unknown error occurred while fetching data.';
  }, [error]);

  return (
    <Card className={cn('border-rose-200 bg-rose-50 dark:border-rose-800/30 dark:bg-rose-950/20', className)}>
      <CardContent className="p-6">
        <Alert variant="destructive" className="border-0 bg-transparent" role="alert">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <AlertTitle className="font-semibold text-rose-800 dark:text-rose-300">{title}</AlertTitle>
          <AlertDescription className="mt-1 text-rose-700 dark:text-rose-300/80">
            {errorMessage}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="mt-3 min-h-[44px] border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:border-rose-700/50 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')} aria-hidden="true" />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </Alert>
      </CardContent>
    </Card>
  );
};

CardError.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      message: PropTypes.string,
    }),
  ]).isRequired,
  onRetry: PropTypes.func.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
};