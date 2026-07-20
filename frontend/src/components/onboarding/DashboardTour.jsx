import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';

const DashboardTour = ({ onFinish, onSkip }) => {
  useEffect(() => {
    // Could show tooltips or highlight elements
    // For now, just simulate a quick tour
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Your dashboard is ready
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        We're setting up your personalised workspace. You'll see sentiment analysis for your first stock.
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={onFinish}>Continue to Dashboard</Button>
        <Button variant="ghost" onClick={onSkip}>Skip tour</Button>
      </div>
    </div>
  );
};

export default DashboardTour;