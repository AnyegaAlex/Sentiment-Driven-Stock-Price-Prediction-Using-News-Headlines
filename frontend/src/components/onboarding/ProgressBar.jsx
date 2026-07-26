import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  className: PropTypes.string,
};

const ProgressBar = ({ currentStep, totalSteps, className = '' }) => {
  const percentage = ((currentStep) / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

ProgressBar.propTypes = propTypes;

export default ProgressBar;