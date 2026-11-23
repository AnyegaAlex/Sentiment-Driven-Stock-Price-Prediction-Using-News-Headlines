// onboarding/OnboardingContainer.jsx
import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../hooks/useOnboarding';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import WelcomeStep from './WelcomeStep';
import PersonaSelection from './PersonaSelection';
import ProfileStep from './ProfileStep';
import InvestmentProfileStep from './InvestmentProfileStep';
import DashboardTour from './CompletionStep';
import apiClient from '@/services/client';
import { getActionErrorMessage } from '@/utils/errorHandler';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const steps = ['welcome', 'profile', 'persona', 'invest', 'tour', 'complete'];
const stepLabels = ['Welcome', 'About You', 'Persona', 'Investing', 'Dashboard Tour', "You're Ready!"];

const OnboardingContainer = () => {
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const { completeOnboarding } = useOnboarding();
  
  const [step, setStep] = useState(() => {
    const savedStep = sessionStorage.getItem('onboardingStep');
    return steps.includes(savedStep) ? savedStep : 'welcome';
  });
  const [onboardingData, setOnboardingData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

  // Auth guard
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboarded && !(showConfetti && step === 'complete')) {
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
      updateStep('invest');
    } catch (err) {
      setError(getActionErrorMessage(err, 'We couldn’t save your selection. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (names) => {
    setLoading(true);
    setError(null);
    try {
      // Skip the request entirely when the user left both fields blank.
      if (names.first_name || names.last_name) {
        await apiClient.patch('/auth/profile/', names);
        await updateUser();
      }
      setOnboardingData(prev => ({ ...prev, ...names }));
      updateStep('persona');
    } catch (err) {
      setError(getActionErrorMessage(err, 'We couldn’t save your name. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvestSave = async (profile) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.patch('/auth/preferences/', profile);
      setOnboardingData(prev => ({ ...prev, ...profile }));
      updateStep('tour');
    } catch (err) {
      setError(getActionErrorMessage(err, 'We couldn’t save your investment preferences. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await completeOnboarding(onboardingData.persona || user?.persona || null);
      setShowConfetti(true);
      updateStep('complete');

      // Refresh the account after entering the completion step so the
      // onboarding guard does not redirect before the celebration is shown.
      try {
        await updateUser();
      } catch {
        setError('Your setup has been saved. We couldn’t refresh your account details, but you can continue to your dashboard.');
      }

      // Keep the completion moment visible, then navigate without reloading the app.
      sessionStorage.removeItem('onboardingStep');
      redirectTimerRef.current = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    } catch (err) {
      setError(getActionErrorMessage(err, 'We couldn’t finish setting up your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      await completeOnboarding(onboardingData.persona || user?.persona || null);
      await updateUser();
      sessionStorage.removeItem('onboardingStep');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getActionErrorMessage(err, 'We couldn’t finish setting up your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Step animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      {/* Confetti */}
      {showConfetti && !prefersReducedMotion && <Confetti recycle={false} numberOfPieces={200} />}

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
                    ? 'text-white'
                    : 'text-gray-500'
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
                <span className="hidden sm:inline ml-1">{label}</span>
              </div>
            ))}
          </div>
          <div className="relative h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 border border-red-400 bg-red-400/10 rounded-lg text-red-400 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
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
                onNext={() => updateStep('profile')}
                onSkip={handleSkip}
                isLoading={loading}
                userName={user?.username}
              />
            )}
            {step === 'profile' && (
              <ProfileStep
                initial={{ first_name: user?.first_name, last_name: user?.last_name }}
                onNext={handleProfileSave}
                onBack={() => updateStep('welcome')}
                onSkip={() => updateStep('persona')}
                loading={loading}
              />
            )}
            {step === 'persona' && (
              <PersonaSelection
                onSelect={handlePersonaSelect}
                onSkip={handleSkip}
                isLoading={loading}
                error={error}
                selectedPersona={onboardingData.persona}
              />
            )}
            {step === 'invest' && (
              <InvestmentProfileStep
                initial={{
                  investment_goal: onboardingData.investment_goal,
                  risk_tolerance: onboardingData.risk_tolerance,
                  experience_level: onboardingData.experience_level,
                }}
                onNext={handleInvestSave}
                onBack={() => updateStep('persona')}
                onSkip={() => updateStep('tour')}
                loading={loading}
                error={error}
              />
            )}
            {step === 'tour' && (
              <DashboardTour
                onFinish={handleFinish}
                onSkip={handleSkip}
                isLoading={loading}
                persona={onboardingData.persona || user?.persona || ''}
              />
            )}
            {step === 'complete' && (
              <div className="text-center py-12 bg-black">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                >
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-400/20 flex items-center justify-center">
                    <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  You&apos;re All Set!
                </h2>
                <p className="text-gray-400">
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