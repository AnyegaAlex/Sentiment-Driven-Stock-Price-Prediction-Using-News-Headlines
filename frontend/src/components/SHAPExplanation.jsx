/**
 * SHAPExplanation – Displays SHAP feature importance for model predictions
 *
 * Features:
 * - Shows top 5 features with importance bars
 * - Color-coded positive/negative contributions
 * - Plain English explanation
 * - Responsive and dark mode ready
 * - Memoized for performance
 * - Loading and empty states
 * - "Show More" functionality
 *
 * @component
 * @param {Object} props
 * @param {Object} props.shapValues - SHAP values per feature
 * @param {Object} props.featureImportance - Alternative feature importance data
 * @param {string} props.explanation - Plain English explanation
 * @param {boolean} props.isLoading - Loading state
 * @param {number} props.maxFeatures - Max features to show (default: 5)
 * @returns {JSX.Element}
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const SHAP_COLORS = {
  positive: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Increases prediction',
  },
  negative: {
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    label: 'Decreases prediction',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format feature name for display
 * - Converts snake_case to Title Case
 * - Handles camelCase
 * - Handles special abbreviations
 */
const formatFeatureName = (name) => {
  if (!name) return 'Unknown';
  
  // Special abbreviations
  const abbreviations = {
    'sma': 'SMA',
    'rsi': 'RSI',
    'macd': 'MACD',
    'bb': 'BB',
    'atr': 'ATR',
    'obv': 'OBV',
    'adx': 'ADX',
    'cci': 'CCI',
  };

  let formatted = name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (str) => str.toUpperCase());

  // Replace abbreviations
  Object.entries(abbreviations).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(key, 'gi'), value);
  });

  return formatted;
};

/**
 * Format SHAP value for display
 */
const formatShapValue = (value) => {
  if (value === undefined || value === null) return '0.00';
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
};

// ============================================================================
// Main Component
// ============================================================================

const SHAPExplanation = ({
  shapValues,
  featureImportance,
  explanation,
  isLoading = false,
  maxFeatures = 5,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Use shapValues or fallback to featureImportance
  const shapData = useMemo(() => {
    return shapValues || featureImportance || {};
  }, [shapValues, featureImportance]);

  // Sort features by absolute value and slice
  const allFeatures = useMemo(() => {
    if (!shapData || Object.keys(shapData).length === 0) return [];
    return Object.entries(shapData)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .filter(([_, value]) => Math.abs(value) > 0.001); // Filter out near-zero values
  }, [shapData]);

  const displayFeatures = useMemo(() => {
    return showAll ? allFeatures : allFeatures.slice(0, maxFeatures);
  }, [allFeatures, showAll, maxFeatures]);

  const maxAbs = useMemo(() => {
    if (!allFeatures.length) return 0.01;
    return Math.max(...allFeatures.map(([_, value]) => Math.abs(value)));
  }, [allFeatures]);

  const hasData = allFeatures.length > 0;

  // ----- Loading State -----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-700" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-700" />
            </div>
            <Skeleton className="h-2 w-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
        <Skeleton className="h-16 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  // ----- Empty State -----
  if (!hasData) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground dark:border-gray-700">
        <p className="text-sm">No SHAP data available for this prediction.</p>
        <p className="text-xs text-muted-foreground">Feature importance data is not provided.</p>
      </div>
    );
  }

  // ----- Render -----
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Top Contributors</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="SHAP info">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs">
                SHAP values show how each feature contributed to the model's prediction.
                Green indicates positive contribution, red indicates negative.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        {allFeatures.length > maxFeatures && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-6 px-2 text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
                Show All ({allFeatures.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Feature Bars */}
      <div className="space-y-3">
        {displayFeatures.map(([feature, value]) => {
          const isPositive = value > 0;
          const color = isPositive ? SHAP_COLORS.positive : SHAP_COLORS.negative;
          const pct = Math.min(Math.abs(value) / maxAbs * 100, 100);

          return (
            <div key={feature} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm capitalize">{formatFeatureName(feature)}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', color.text)}>
                    {formatShapValue(value)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isPositive ? '↑' : '↓'}
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn(
                    'absolute h-full rounded-full transition-all duration-500',
                    color.bar
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      )}

      {/* Feature Count */}
      {allFeatures.length > maxFeatures && !showAll && (
        <p className="text-xs text-muted-foreground">
          Showing top {maxFeatures} of {allFeatures.length} features
        </p>
      )}
    </div>
  );
};

// ============================================================================
// PropTypes
// ============================================================================

SHAPExplanation.propTypes = {
  shapValues: PropTypes.objectOf(PropTypes.number),
  featureImportance: PropTypes.objectOf(PropTypes.number),
  explanation: PropTypes.string,
  isLoading: PropTypes.bool,
  maxFeatures: PropTypes.number,
};

SHAPExplanation.defaultProps = {
  shapValues: null,
  featureImportance: null,
  explanation: null,
  isLoading: false,
  maxFeatures: 5,
};

SHAPExplanation.displayName = 'SHAPExplanation';

export default SHAPExplanation;