// pages/Onboarding/Step1_Profile.jsx
/**
 * Step 1 of the onboarding flow.
 * Collects the user's nickname, full name, and a short bio.
 *
 * Nickname is required; the rest are optional.
 * All fields are stored in the parent's formData state.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const propTypes = {
  /** Form data object containing nickname, fullName, bio */
  formData: PropTypes.shape({
    nickname: PropTypes.string,
    fullName: PropTypes.string,
    bio: PropTypes.string,
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

const Step1_Profile = ({
  formData,
  setFormData,
  onNext,
  onSkip,
  isLoading = false,
  className = '',
}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nickname?.trim()) {
      newErrors.nickname = 'Nickname is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mark all fields as touched for error display
    setTouched({ nickname: true, fullName: true, bio: true });
    if (validate()) {
      onNext();
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)} noValidate>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tell us about yourself
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This helps us personalise your experience.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nickname – required */}
        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Nickname <span className="text-red-500">*</span>
          </label>
          <input
            id="nickname"
            type="text"
            value={formData.nickname || ''}
            onChange={(e) => handleChange('nickname', e.target.value)}
            onBlur={() => handleBlur('nickname')}
            placeholder="e.g., StockWatcher"
            maxLength={30}
            className={cn(
              'w-full px-4 py-2 border rounded-lg',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
              errors.nickname && touched.nickname
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            )}
            required
            disabled={isLoading}
            aria-describedby="nickname-help"
          />
          {errors.nickname && touched.nickname && (
            <p className="text-sm text-red-500 mt-1" role="alert">
              {errors.nickname}
            </p>
          )}
          <p id="nickname-help" className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This will be shown on your profile and predictions.
          </p>
        </div>

        {/* Full Name – optional */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName || ''}
            onChange={(e) => handleChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            placeholder="Your full name"
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            disabled={isLoading}
          />
        </div>

        {/* Bio – optional */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Bio <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="bio"
            value={formData.bio || ''}
            onChange={(e) => handleChange('bio', e.target.value)}
            onBlur={() => handleBlur('bio')}
            placeholder="Tell us about your trading journey..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none disabled:opacity-50"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-right">
            {formData.bio?.length || 0}/500
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
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
    </form>
  );
};

Step1_Profile.propTypes = propTypes;

export default Step1_Profile;