// onboarding/OnboardingContainer.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../hooks/useOnboarding';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import WelcomeStep from './WelcomeStep';
import PersonaSelection from './PersonaSelection';
import DashboardTour from './CompletionStep';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const steps = ['welcome', 'persona', 'tour', 'complete'];
const stepLabels = ['Welcome', 'Your Persona', 'Dashboard Tour', 'You\'re Ready!'];

const OnboardingContainer = () => {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const { completeOnboarding } = useOnboarding();
  
  const [step, setStep] = useState(() => {
    return sessionStorage.getItem('onboardingStep') || 'welcome';
  });
  const [onboardingData, setOnboardingData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

  // Auth guard
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateStep = (newStep) => {
    setStep(newStep);
    sessionStorage.setItem('onboardingStep', newStep);
  };

  const handlePersonaSelect = async (persona) => {
    setLoading(true);
    setError(null);
    setOnboardingData(prev => ({ ...prev, persona }));
    
    try {
      await updateUser({ persona });
      updateStep('tour');
    } catch (err) {
      setError(err.message || 'Failed to save persona. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await completeOnboarding(onboardingData);
      await updateUser();
      setShowConfetti(true);
      updateStep('complete');
      
      // Redirect after celebration
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding({ ...onboardingData, skip: true });
      await updateUser();
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Failed to skip onboarding. Please try again.');
    }
  };

  // Step animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      {/* Confetti */}
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <div className="w-full max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={cn(
                  'text-xs font-medium transition-colors',
                  index <= currentStepIndex
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
                <span className="hidden sm:inline ml-1">{label}</span>
              </div>
            ))}
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-gray-200 dark:bg-gray-700"
          />
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          </motion.div>
        )}

        {/* Steps with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {step === 'welcome' && (
              <WelcomeStep
                onNext={() => updateStep('persona')}
                onSkip={handleSkip}
                loading={loading}
                userName={user?.username}
              />
            )}
            {step === 'persona' && (
              <PersonaSelection
                onSelect={handlePersonaSelect}
                onSkip={handleSkip}
                loading={loading}
                error={error}
                selectedPersona={onboardingData.persona}
              />
            )}
            {step === 'tour' && (
              <DashboardTour
                onFinish={handleFinish}
                onSkip={handleSkip}
                loading={loading}
                persona={onboardingData.persona}
              />
            )}
            {step === 'complete' && (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                >
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  You're All Set! 🎉
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Redirecting to your dashboard...
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingContainer;