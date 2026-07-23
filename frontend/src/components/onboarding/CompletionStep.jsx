// components/onboarding/CompletionStep.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const propTypes = {
  /** Function to call when user finishes */
  onFinish: PropTypes.func.isRequired,
  /** Function to call when user skips */
  onSkip: PropTypes.func.isRequired,
  /** Whether a loading action is in progress */
  isLoading: PropTypes.bool,
  /** User's name for personalization */
  userName: PropTypes.string,
  /** User's persona for tailored messaging */
  persona: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

const CompletionStep = ({
  onFinish,
  onSkip,
  isLoading = false,
  userName = '',
  persona = '',
  className = '',
}) => {
  const getMessage = () => {
    const base = 'Your dashboard is ready.';
    const personaMessages = {
      trader: 'View real-time sentiment for your watchlist.',
      researcher: 'Access historical data and model accuracy metrics.',
      developer: 'Explore the API or view live sentiment data.',
      analyst: 'Find sentiment data to support your investment theses.',
      student: 'Learn NLP in finance with live examples.',
    };
    const personaMessage = personaMessages[persona] || 'Start analysing stocks with AI-powered sentiment.';
    return `${base} ${personaMessage}`;
  };

  return (
    <div className={cn('text-center space-y-6', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
        <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        All set, {userName || 'Trader'}!
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        {getMessage()}
      </p>
      
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <Button
          onClick={onFinish}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? 'Loading...' : 'Go to Dashboard'}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

CompletionStep.propTypes = propTypes;

export default CompletionStep;