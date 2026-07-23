// pages/Onboarding/Step4_Complete.jsx
/**
 * Step 4 – Completion summary.
 * Shows a summary of the user's choices and a final "Get started" button.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Check, TrendingUp, Shield, Award, Star, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const propTypes = {
  /** Form data containing all onboarding choices */
  formData: PropTypes.shape({
    nickname: PropTypes.string,
    fullName: PropTypes.string,
    bio: PropTypes.string,
    investmentGoal: PropTypes.string,
    riskTolerance: PropTypes.string,
    experienceLevel: PropTypes.string,
    persona: PropTypes.string,
    watchlist: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  /** Function to handle completion */
  onComplete: PropTypes.func.isRequired,
  /** Whether completion is in progress */
  isLoading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

// Display names for values
const DISPLAY = {
  investmentGoal: {
    growth: 'Growth',
    income: 'Income',
    value: 'Value',
    trading: 'Trading',
    retirement: 'Retirement',
  },
  riskTolerance: {
    conservative: 'Conservative',
    moderate: 'Moderate',
    aggressive: 'Aggressive',
  },
  experienceLevel: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  },
  persona: {
    trader: 'Trader',
    researcher: 'Quant Researcher',
    developer: 'Developer',
    analyst: 'Financial Analyst',
    student: 'Student',
  },
};

// Icons for summary items
const ICONS = {
  investmentGoal: TrendingUp,
  riskTolerance: Shield,
  experienceLevel: Award,
  persona: Star,
  watchlist: List,
};

// Descriptions for summary items
const DESCRIPTIONS = {
  investmentGoal: 'Primary investment objective',
  riskTolerance: 'Comfort with market volatility',
  experienceLevel: 'Trading experience',
  persona: 'Primary role',
  watchlist: 'Stocks you want to track',
};

const Step4_Complete = ({
  formData,
  onComplete,
  isLoading = false,
  className = '',
}) => {
  const { nickname, fullName, investmentGoal, riskTolerance, experienceLevel, persona, watchlist } = formData;

  const summaryItems = [
    {
      key: 'investmentGoal',
      label: 'Investment Goal',
      value: DISPLAY.investmentGoal[investmentGoal] || investmentGoal,
    },
    {
      key: 'riskTolerance',
      label: 'Risk Tolerance',
      value: DISPLAY.riskTolerance[riskTolerance] || riskTolerance,
    },
    {
      key: 'experienceLevel',
      label: 'Experience',
      value: DISPLAY.experienceLevel[experienceLevel] || experienceLevel,
    },
    {
      key: 'persona',
      label: 'Role',
      value: DISPLAY.persona[persona] || persona,
    },
    {
      key: 'watchlist',
      label: 'Watchlist',
      value: watchlist?.length > 0 ? watchlist.join(', ') : 'None yet',
    },
  ];

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          All set, {nickname || 'Trader'}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review your choices below and get started.
        </p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaryItems.map((item) => {
          const Icon = ICONS[item.key] || Star;
          return (
            <div
              key={item.key}
              className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: Profile preview (if name/bio provided) */}
      {(nickname || fullName) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Profile:</span>
            {nickname && ` ${nickname}`}
            {fullName && ` (${fullName})`}
            {formData.bio && ` – ${formData.bio}`}
          </p>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-2">
        <Button
          onClick={onComplete}
          disabled={isLoading}
          size="lg"
          className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up...
            </span>
          ) : (
            'Go to Dashboard'
          )}
        </Button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          You can change any of these settings later.
        </p>
      </div>
    </div>
  );
};

Step4_Complete.propTypes = propTypes;

export default Step4_Complete;