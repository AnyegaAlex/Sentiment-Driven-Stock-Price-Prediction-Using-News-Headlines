import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../hooks/useOnboarding';
import WelcomeStep from './WelcomeStep';
import PersonaSelection from './PersonaSelection';
import DashboardTour from './DashboardTour';

const OnboardingContainer = () => {
  const [step, setStep] = useState('welcome');
  const { user, updateProfile } = useAuth();
  const { completeOnboarding } = useOnboarding();

  const handlePersonaSelect = async (persona) => {
    await updateProfile({ persona });
    setStep('tour');
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {step === 'welcome' && (
        <WelcomeStep onNext={() => setStep('persona')} onSkip={handleSkip} />
      )}
      {step === 'persona' && (
        <PersonaSelection onSelect={handlePersonaSelect} onSkip={handleSkip} />
      )}
      {step === 'tour' && (
        <DashboardTour onFinish={handleFinish} onSkip={handleSkip} />
      )}
    </div>
  );
};

export default OnboardingContainer;