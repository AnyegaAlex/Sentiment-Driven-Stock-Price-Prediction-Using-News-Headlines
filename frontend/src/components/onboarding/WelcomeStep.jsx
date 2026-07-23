import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const propTypes = {
  /** Function to call when user clicks "Get Started" */
  onNext: PropTypes.func.isRequired,
  /** Function to call when user skips onboarding */
  onSkip: PropTypes.func.isRequired,
  /** Whether a loading action is in progress */
  isLoading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** User's name for personalization */
  userName: PropTypes.string,
};

const WelcomeStep = ({ 
  onNext, 
  onSkip, 
  isLoading = false, 
  className = '',
  userName = '',
}) => {
  return (
    <div className={cn('text-center space-y-6', className)}>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Welcome{userName ? `, ${userName}` : ''}
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
        Set up your preferences to get the most out of the platform.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button 
          onClick={onNext} 
          size="lg" 
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Get Started'}
        </Button>
        <Button 
          variant="ghost" 
          onClick={onSkip} 
          disabled={isLoading}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

WelcomeStep.propTypes = propTypes;

export default WelcomeStep;