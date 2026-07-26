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
    const personaMessage = personaMessages[persona] || 'Start analysing stocks with LSTM + FinBERT-powered sentiment.';
    return `${base} ${personaMessage}`;
  };

  return (
    <div className={cn('text-center space-y-6 bg-black', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-400/20">
        <Check className="w-8 h-8 text-green-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-white">
        All set, {userName || 'Trader'}!
      </h2>
      
      <p className="text-gray-400 max-w-md mx-auto">
        {getMessage()}
      </p>
      
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <Button
          onClick={onFinish}
          disabled={isLoading}
          size="lg"
          className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          {isLoading ? 'Loading...' : 'Go to Dashboard'}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

CompletionStep.propTypes = propTypes;

export default CompletionStep;