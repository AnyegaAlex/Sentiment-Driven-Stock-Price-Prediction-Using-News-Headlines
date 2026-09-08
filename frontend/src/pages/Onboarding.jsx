import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import OnboardingContainer from '../components/onboarding/OnboardingContainer';

const Onboarding = () => {
  const { user, isLoading } = useAuth();
  const { isComplete } = useOnboarding();

  // Show loading spinner while user is being fetched
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading profile..." />;
  }

  if (!user) return <Navigate to="/login" />;
  if (isComplete) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-black">
      <OnboardingContainer />
    </div>
  );
};

export default Onboarding;