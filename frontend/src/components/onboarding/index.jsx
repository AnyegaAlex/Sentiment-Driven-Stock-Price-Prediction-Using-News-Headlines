// pages/Onboarding/index.jsx
/**
 * Onboarding Flow – Production-Ready Component
 *
 * Guides new users through account setup in 4 steps:
 * 1. Profile – nickname, full name, bio
 * 2. Preferences – investment goal, risk tolerance, experience, persona
 * 3. Watchlist – add stocks to track
 * 4. Completion – review and finish
 *
 * Features:
 * - Step persistence via sessionStorage (survives page refresh)
 * - Form validation per step with error feedback
 * - Loading states for async operations
 * - Auth guards to prevent access if already onboarded
 * - Progressive enhancement with smooth scroll between steps
 *
 * @version 2.1.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '@/services/client';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

import Step1_Profile from './Step1_Profile';
import Step2_Preferences from './Step2_Preferences';
import Step3_Watchlist from './Step3_Watchlist';
import CompletionStep from './CompletionStep';
import ProgressBar from '../../components/onboarding/ProgressBar';
import Tooltip from '../../components/onboarding/Tooltip';

/**
 * Default form values used when user data is not available
 */
const DEFAULT_FORM_VALUES = {
  nickname: '',
  fullName: '',
  bio: '',
  investmentGoal: 'growth',
  riskTolerance: 'moderate',
  experienceLevel: 'beginner',
  persona: 'trader',
  watchlist: [],
};

/**
 * Tooltip messages displayed for each step
 */
const TOOLTIP_MESSAGES = {
  1: 'A nickname helps us personalise your experience. You can change it later.',
  2: 'Your preferences and persona help us tailor content for you.',
  3: 'Add stocks you want to track. You can always update this later.',
  4: 'Almost done. Review your choices and get started.',
};

/**
 * Total number of onboarding steps
 */
const TOTAL_STEPS = 4;

/**
 * Onboarding Component
 *
 * @returns {JSX.Element} Rendered onboarding flow
 */
const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser, isAuthenticated, isLoading } = useAuth(); // ✅ Add refreshUser
  const { isComplete, persona } = useOnboarding();

  // ============================================================
  // STATE
  // ============================================================

  /**
   * Current step (1-4), persisted in sessionStorage
   */
  const [step, setStep] = useState(() => {
    const stored = sessionStorage.getItem('onboardingStep');
    return stored ? parseInt(stored, 10) : 1;
  });

  /**
   * Form data collected across all steps
   */
  const [formData, setFormData] = useState({
    nickname: user?.nickname || DEFAULT_FORM_VALUES.nickname,
    fullName: user?.full_name || DEFAULT_FORM_VALUES.fullName,
    bio: DEFAULT_FORM_VALUES.bio,
    investmentGoal: DEFAULT_FORM_VALUES.investmentGoal,
    riskTolerance: DEFAULT_FORM_VALUES.riskTolerance,
    experienceLevel: DEFAULT_FORM_VALUES.experienceLevel,
    persona: persona || DEFAULT_FORM_VALUES.persona,
    watchlist: DEFAULT_FORM_VALUES.watchlist,
  });

  /**
   * Loading state for async operations
   */
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Error state for displaying user feedback
   */
  const [error, setError] = useState(null);

  // ============================================================
  // EFFECTS
  // ============================================================

  /**
   * Redirect to dashboard if onboarding is already complete
   */
  useEffect(() => {
    if (isComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [isComplete, navigate]);

  /**
   * Redirect to login if user becomes unauthenticated
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // ============================================================
  // AUTH GUARDS
  // ============================================================

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  /**
   * Validates the current step's form data
   * @returns {boolean} True if validation passes
   */
  const validateStep = () => {
    setError(null);

    if (step === 1 && !formData.nickname?.trim()) {
      setError('Nickname is required');
      return false;
    }

    if (step === 2) {
      const requiredFields = ['investmentGoal', 'riskTolerance', 'experienceLevel', 'persona'];
      const missing = requiredFields.filter((field) => !formData[field]);
      if (missing.length > 0) {
        setError('Please complete all required fields');
        return false;
      }
    }

    if (step === 3 && formData.watchlist.length === 0) {
      setError('Add at least one stock to your watchlist');
      return false;
    }

    return true;
  };

  /**
   * Advances to the next step or completes onboarding
   */
  const handleNext = () => {
    if (!validateStep()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === TOTAL_STEPS) {
      handleComplete();
    } else {
      const nextStep = step + 1;
      setStep(nextStep);
      sessionStorage.setItem('onboardingStep', String(nextStep));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Returns to the previous step
   */
  const handleBack = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      sessionStorage.setItem('onboardingStep', String(prevStep));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Saves all onboarding data and marks user as onboarded
   */
  const handleComplete = async () => {
    setError(null);
    setIsSaving(true);

    try {
      console.log('[Onboarding] Starting completion...');
      console.log('[Onboarding] Form data:', formData);

      // ============================================================
      // ✅ STEP 1: Update user profile on backend
      // ============================================================
      await apiClient.patch('/auth/profile/', {
        full_name: formData.fullName,
        nickname: formData.nickname,
        bio: formData.bio,
        onboarded: true,
        persona: formData.persona,
      });
      console.log('[Onboarding] Profile updated');

      // ============================================================
      // ✅ STEP 2: Save user preferences
      // ============================================================
      await apiClient.patch('/auth/preferences/', {
        investment_goal: formData.investmentGoal,
        risk_tolerance: formData.riskTolerance,
        experience_level: formData.experienceLevel,
      });
      console.log('[Onboarding] Preferences saved');

      // ============================================================
      // ✅ STEP 3: Save watchlist symbols
      // ============================================================
      if (formData.watchlist.length > 0) {
        const watchlistPromises = formData.watchlist.map((symbol) =>
          apiClient.post('/auth/watchlist/', { symbol: symbol.toUpperCase() })
        );
        await Promise.all(watchlistPromises);
        console.log('[Onboarding] Watchlist saved');
      }

      // ============================================================
      // ✅ STEP 4: Refresh user context (CRITICAL)
      // ============================================================
      const refreshedUser = await refreshUser();
      console.log('[Onboarding] User refreshed:', refreshedUser);

      // ============================================================
      // ✅ STEP 5: Force update if needed (prevents race conditions)
      // ============================================================
      if (!refreshedUser?.onboarded) {
        console.warn('[Onboarding] refreshUser returned stale data, forcing update...');
        updateUser({
          ...(refreshedUser || user),
          onboarded: true,
          full_name: formData.fullName,
          nickname: formData.nickname,
          bio: formData.bio,
          persona: formData.persona,
        });
      }

      // ============================================================
      // ✅ STEP 6: Clear stored step
      // ============================================================
      sessionStorage.removeItem('onboardingStep');

      // ============================================================
      // ✅ STEP 7: Redirect to dashboard
      // ============================================================
      console.log('[Onboarding] Navigating to dashboard...');
      navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error('[Onboarding] Error:', err);
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to complete onboarding. Please try again.';
      setError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsSaving(false);
    }
  };

  /**
   * Skips onboarding and redirects to dashboard
   */
  const handleSkip = () => {
    sessionStorage.removeItem('onboardingStep');
    navigate('/dashboard', { replace: true });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Set up your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This takes about two minutes.
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />

        {/* Tooltip */}
        <Tooltip text={TOOLTIP_MESSAGES[step]} />

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="mt-4 animate-slide-down"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 mt-6">
          {step === 1 && (
            <Step1_Profile
              formData={formData}
              setFormData={setFormData}
              onNext={handleNext}
              onSkip={handleSkip}
              isLoading={isSaving}
            />
          )}

          {step === 2 && (
            <Step2_Preferences
              formData={formData}
              setFormData={setFormData}
              onNext={handleNext}
              onSkip={handleSkip}
              isLoading={isSaving}
            />
          )}

          {step === 3 && (
            <Step3_Watchlist
              formData={formData}
              setFormData={setFormData}
              onNext={handleNext}
              onSkip={handleSkip}
              isLoading={isSaving}
            />
          )}

          {step === 4 && (
            <CompletionStep
              onFinish={handleComplete}
              onSkip={handleSkip}
              isLoading={isSaving}
              userName={formData.nickname}
              persona={formData.persona}
            />
          )}

          {/* Navigation Buttons (steps 1-3 only) */}
          {step < 4 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1 || isSaving}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          )}
        </div>

        {/* Skip Link */}
        {step < 4 && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;