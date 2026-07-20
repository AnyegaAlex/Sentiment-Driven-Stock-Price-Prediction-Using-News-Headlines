import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import OnboardingContainer from '../components/onboarding/OnboardingContainer';

const Onboarding = () => {
  const { user } = useAuth();
  const { isComplete } = useOnboarding();

  if (!user) return <Navigate to="/login" />;
  if (isComplete) return <Navigate to="/dashboard" />;

  return <OnboardingContainer />;
};

export default Onboarding;