import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle } from 'lucide-react';

const DriftAlert = ({ severity, drop }) => {
  const severityMap = {
    low: { color: 'yellow', icon: AlertTriangle, title: 'Mild Drift Detected' },
    medium: { color: 'orange', icon: AlertCircle, title: 'Moderate Drift Detected' },
    high: { color: 'red', icon: AlertCircle, title: 'Severe Drift Detected' },
  };

  const info = severityMap[severity] || severityMap.low;
  const Icon = info.icon;

  return (
    <Alert variant="destructive" className="border-l-4 border-l-red-500">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-red-500" />
        <div>
          <AlertTitle>{info.title}</AlertTitle>
          <AlertDescription>
            Model performance has dropped by {drop}% compared to baseline.
            {severity === 'high' && ' Consider retraining or adjusting the model.'}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default DriftAlert;