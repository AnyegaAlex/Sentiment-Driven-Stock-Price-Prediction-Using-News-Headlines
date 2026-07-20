import React from 'react';
import { Button } from '@/components/ui/button';

const WelcomeStep = ({ onNext, onSkip }) => (
  <div className="text-center space-y-6">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Tickflow Sentiment</h1>
    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
      Let's personalise your experience so you can get the most out of the platform.
    </p>
    <div className="flex flex-wrap justify-center gap-4">
      <Button onClick={onNext} size="lg">Get Started</Button>
      <Button variant="ghost" onClick={onSkip}>Skip for now</Button>
    </div>
  </div>
);

export default WelcomeStep;