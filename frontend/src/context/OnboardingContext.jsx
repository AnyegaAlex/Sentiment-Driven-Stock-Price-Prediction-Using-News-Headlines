import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import apiClient from '@/services/client';

export const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const { user, updateUser, refreshUser } = useAuth();
  const [isComplete, setIsComplete] = useLocalStorage('onboardingComplete', false);
  const [step, setStep] = useState('welcome');
  const [persona, setPersona] = useState(null);

  // Sync with backend when user loads
  useEffect(() => {
    if (user) {
      setIsComplete(user.onboarded || false);
      setPersona(user.persona || null);
    }
  }, [user]);

  const completeOnboarding = async (selectedPersona = null) => {
    console.log('[OnboardingContext] Starting onboarding...', selectedPersona);
    
    try {
      const payload = { onboarded: true };
      if (selectedPersona) {
        payload.persona = selectedPersona;
        setPersona(selectedPersona);
      }
      
      console.log('[OnboardingContext] Saving profile...', payload);
      
      // Direct API call to update profile
      await apiClient.patch('/auth/profile/', payload);
      
      console.log('[OnboardingContext] Profile saved, refreshing user...');
      
      // Refresh user context
      const refreshedUser = await refreshUser();
      console.log('[OnboardingContext] User refreshed:', refreshedUser);
      
      // Force update if needed (prevents race conditions)
      if (!refreshedUser?.onboarded) {
        console.warn('[OnboardingContext] refreshUser returned stale data, forcing update...');
        updateUser({ ...(refreshedUser || user), onboarded: true });
      }
      
      setIsComplete(true);
      console.log('[OnboardingContext] Onboarding complete!');
      
    } catch (error) {
      console.error('[OnboardingContext] Failed to complete onboarding:', error);
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