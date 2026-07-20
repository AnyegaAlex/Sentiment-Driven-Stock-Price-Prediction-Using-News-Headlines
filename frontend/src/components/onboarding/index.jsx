// pages/Onboarding/index.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../hooks/useAuth'; // adjust import path

import Step1_Profile from './Step1_Profile';
import Step2_Preferences from './Step2_Preferences';
import Step3_Watchlist from './Step3_Watchlist';
import Step4_Complete from './Step4_Complete';

import ProgressBar from '../../components/onboarding/ProgressBar';
import Tooltip from '../../components/onboarding/Tooltip';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { isComplete, completeOnboarding, persona } = useOnboarding();

  // Local step tracking (1‑based)
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    fullName: user?.full_name || '',
    bio: '',
    investmentGoal: 'growth',
    riskTolerance: 'moderate',
    experienceLevel: 'beginner',
    persona: persona || 'trader', // default from context if any
    watchlist: [],
  });

  // If onboarding is already complete, skip to dashboard
  useEffect(() => {
    if (isComplete) {
      navigate('/dashboard');
    }
  }, [isComplete, navigate]);

  const handleNext = () => {
    if (step === totalSteps) {
      handleComplete();
    } else {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    try {
      // 1. Update profile (nickname, full name, bio, persona, onboarded)
      await updateProfile({
        full_name: formData.fullName,
        nickname: formData.nickname,
        bio: formData.bio,
        persona: formData.persona,
        onboarded: true,
      });

      // 2. Save preferences
      const token = localStorage.getItem('access_token');
      await fetch('/api/v1/auth/preferences/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          investment_goal: formData.investmentGoal,
          risk_tolerance: formData.riskTolerance,
          experience_level: formData.experienceLevel,
        }),
      });

      // 3. Save watchlist
      for (const symbol of formData.watchlist) {
        await fetch('/api/v1/auth/watchlist/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ symbol }),
        });
      }

      // 4. Mark onboarding as complete in context (also updates persona)
      await completeOnboarding(formData.persona);

      // 5. Redirect
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding failed:', error);
      // Show a toast/notification in production
    }
  };

  const tooltipMessages = {
    1: 'A nickname helps us personalise your experience. You can change it later.',
    2: 'Your preferences and persona help us tailor content for you.',
    3: 'Add stocks you want to track. You can always update this later.',
    4: 'Almost done. Review your choices and get started.',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Set up your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This takes about two minutes.
          </p>
        </div>

        <ProgressBar currentStep={step} totalSteps={totalSteps} />
        <Tooltip text={tooltipMessages[step]} />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 mt-6">
          {step === 1 && (
            <Step1_Profile formData={formData} setFormData={setFormData} />
          )}
          {step === 2 && (
            <Step2_Preferences formData={formData} setFormData={setFormData} />
          )}
          {step === 3 && (
            <Step3_Watchlist formData={formData} setFormData={setFormData} />
          )}
          {step === 4 && (
            <Step4_Complete formData={formData} />
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-2 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              {step === totalSteps ? 'Get started' : 'Continue'}
            </button>
          </div>
        </div>

        {step < totalSteps && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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