import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { api } from '@/services/api';

export const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [isComplete, setIsComplete] = useLocalStorage('onboardingComplete', false);
  const [step, setStep] = useState('welcome'); // welcome | persona | tour | done
  const [persona, setPersona] = useState(null);

  // Sync with backend when user loads
  useEffect(() => {
    if (user) {
      setIsComplete(user.onboarded || false);
      setPersona(user.persona || null);
    }
  }, [user]);

  const completeOnboarding = async (selectedPersona = null) => {
    try {
      const payload = { onboarded: true };
      if (selectedPersona) {
        payload.persona = selectedPersona;
        setPersona(selectedPersona);
      }
      await updateProfile(payload);
      setIsComplete(true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
  };

  const value = {
    isComplete,
    step,
    setStep,
    persona,
    setPersona,
    completeOnboarding,
    skipOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};