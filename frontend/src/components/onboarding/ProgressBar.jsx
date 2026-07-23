// components/onboarding/ProgressBar.jsx
import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  className: PropTypes.string,
};

const ProgressBar = ({ currentStep, totalSteps, className = '' }) => {
  const percentage = ((currentStep) / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 ease-out"
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