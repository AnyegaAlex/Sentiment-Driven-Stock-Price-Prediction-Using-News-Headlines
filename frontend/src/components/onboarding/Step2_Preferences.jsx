// pages/Onboarding/Step2_Preferences.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GOALS = [
  { value: 'growth', label: 'Growth', description: 'Focus on long-term capital appreciation.' },
  { value: 'income', label: 'Income', description: 'Generate regular income from dividends.' },
  { value: 'value', label: 'Value', description: 'Look for undervalued stocks with potential.' },
  { value: 'trading', label: 'Trading', description: 'Active short-term opportunities.' },
  { value: 'retirement', label: 'Retirement', description: 'Build a portfolio for retirement.' },
];

const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', description: 'Low risk, stable returns.' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced risk and reward.' },
  { value: 'aggressive', label: 'Aggressive', description: 'High risk, high reward.' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to investing.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with stocks.' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced trader or analyst.' },
];

const PERSONA_CHOICES = [
  { value: 'trader', label: 'Trader', description: 'Active, short-term focused.' },
  { value: 'researcher', label: 'Quant Researcher', description: 'Data-driven, deep analysis.' },
  { value: 'developer', label: 'Developer', description: 'Building on our APIs.' },
  { value: 'analyst', label: 'Financial Analyst', description: 'Professional investment analysis.' },
  { value: 'student', label: 'Student', description: 'Learning about markets and AI.' },
];

const propTypes = {
  /** Form data object containing investment preferences */
  formData: PropTypes.shape({
    investmentGoal: PropTypes.string,
    riskTolerance: PropTypes.string,
    experienceLevel: PropTypes.string,
    persona: PropTypes.string,
  }).isRequired,
  /** Function to update form data */
  setFormData: PropTypes.func.isRequired,
  /** Function to proceed to next step */
  onNext: PropTypes.func.isRequired,
  /** Function to skip onboarding */
  onSkip: PropTypes.func.isRequired,
  /** Whether a loading action is in progress */
  isLoading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

const Step2_Preferences = ({
  formData,
  setFormData,
  onNext,
  onSkip,
  isLoading = false,
  className = '',
}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const requiredFields = ['investmentGoal', 'riskTolerance', 'experienceLevel', 'persona'];

  const validate = () => {
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = true;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    // Mark all fields as touched
    const touchedFields = requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouched(touchedFields);

    if (validate()) {
      onNext();
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const isFieldError = (field) => {
    return errors[field] && touched[field] && !formData[field];
  };

  const renderOptionGroup = (options, field, label, required = true) => (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleFieldChange(field, option.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, [field]: true }))}
            className={cn(
              'p-4 text-left rounded-lg border-2 transition-all',
              'hover:border-gray-400 dark:hover:border-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              isFieldError(field)
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : formData[field] === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
            disabled={isLoading}
            aria-pressed={formData[field] === option.value}
          >
            <div className="font-semibold text-gray-900 dark:text-white">
              {option.label}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {option.description}
            </div>
          </button>
        ))}
      </div>
      {isFieldError(field) && (
        <p className="text-sm text-red-500 mt-1" role="alert">
          Please select an option
        </p>
      )}
    </div>
  );

  const isFormValid = requiredFields.every((field) => formData[field]);

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your investment style
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          These help us tailor the content and recommendations you see.
        </p>
      </div>

      <div className="space-y-6">
        {renderOptionGroup(GOALS, 'investmentGoal', 'Investment Goal')}
        {renderOptionGroup(RISK_LEVELS, 'riskTolerance', 'Risk Tolerance')}
        {renderOptionGroup(EXPERIENCE_LEVELS, 'experienceLevel', 'Experience Level')}
        {renderOptionGroup(PERSONA_CHOICES, 'persona', 'Your role')}
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!isFormValid || isLoading}
          size="lg"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
        <Button
          type="button"
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

Step2_Preferences.propTypes = propTypes;

export default Step2_Preferences;