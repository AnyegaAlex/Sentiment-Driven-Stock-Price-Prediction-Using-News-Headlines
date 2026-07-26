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
 * @property {string} chart - Chart color string
 * @property {string} chartBg - Chart background color string
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
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    text: 'text-green-400',
    badge: 'bg-green-400/20 text-green-400 border-green-400/30',
    chart: '#34D399',
    chartBg: 'rgba(52, 211, 153, 0.15)',
    hover: 'hover:bg-green-400/5',
  },
  negative: {
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    text: 'text-red-400',
    badge: 'bg-red-400/20 text-red-400 border-red-400/30',
    chart: '#F87171',
    chartBg: 'rgba(248, 113, 113, 0.15)',
    hover: 'hover:bg-red-400/5',
  },
  neutral: {
    bg: 'bg-gray-800/30',
    border: 'border-gray-700/50',
    text: 'text-gray-400',
    badge: 'bg-gray-700/50 text-gray-400 border-gray-700/50',
    chart: '#9CA3AF',
    chartBg: 'rgba(156, 163, 175, 0.15)',
    hover: 'hover:bg-gray-800/20',
  },
  warning: {
    bg: 'bg-gray-700/30',
    border: 'border-gray-600/30',
    text: 'text-gray-300',
    badge: 'bg-gray-700/50 text-gray-300 border-gray-600/30',
    chart: '#D1D5DB',
    chartBg: 'rgba(209, 213, 219, 0.15)',
    hover: 'hover:bg-gray-700/20',
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
          color: '#9CA3AF',
          usePointStyle: true,
          boxWidth: 10,
          font: { size: isMobile ? 11 : 13 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 17, 17, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(31, 41, 55, 0.5)',
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
          color: '#9CA3AF',
          font: { size: fontSize },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#9CA3AF',
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
      'relative overflow-hidden border border-gray-800 bg-gray-900 transition-shadow duration-300',
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
  <Card className={cn('border border-gray-800 bg-gray-900', className)}>
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
    <Card className={cn('border border-red-400 bg-red-400/10', className)}>
      <CardContent className="p-6">
        <Alert variant="destructive" className="border-0 bg-transparent" role="alert">
          <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          <AlertTitle className="font-semibold text-white">{title}</AlertTitle>
          <AlertDescription className="mt-1 text-gray-300">
            {errorMessage}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="mt-3 min-h-[44px] border border-red-400 text-red-400 hover:bg-red-400/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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