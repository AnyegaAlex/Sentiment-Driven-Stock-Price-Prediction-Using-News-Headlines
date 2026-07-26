import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const DriftAlert = ({ severity, drop }) => {
  const severityMap = {
    low: { 
      icon: AlertTriangle, 
      title: 'Mild Drift Detected',
      variant: 'warning',
      borderColor: 'border-gray-500',
      bgColor: 'bg-gray-800/30',
      textColor: 'text-gray-300',
    },
    medium: { 
      icon: AlertCircle, 
      title: 'Moderate Drift Detected',
      variant: 'warning',
      borderColor: 'border-gray-400',
      bgColor: 'bg-gray-800/50',
      textColor: 'text-gray-200',
    },
    high: { 
      icon: AlertCircle, 
      title: 'Severe Drift Detected',
      variant: 'error',
      borderColor: 'border-red-400',
      bgColor: 'bg-red-400/10',
      textColor: 'text-red-400',
    },
  };

  const info = severityMap[severity] || severityMap.low;
  const Icon = info.icon;

  const severityDescriptions = {
    low: ' LSTM model performance has slightly decreased. Monitor closely.',
    medium: ' LSTM model performance has degraded significantly. Consider reviewing the model.',
    high: ' LSTM model performance has dropped substantially. Retraining is recommended.',
  };

  const description = severityDescriptions[severity] || severityDescriptions.low;

  return (
    <Alert 
      className={cn(
        'border-l-4 border-l-current rounded-lg',
        info.borderColor,
        info.bgColor,
        'text-white'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', info.textColor)} aria-hidden="true" />
        <div>
          <AlertTitle className={cn('font-semibold text-white', info.textColor)}>
            {info.title}
          </AlertTitle>
          <AlertDescription className={cn('text-sm', info.textColor === 'text-red-400' ? 'text-red-400/90' : 'text-gray-400')}>
            LSTM model performance has dropped by {drop}% compared to baseline.
            {description}
            {severity === 'high' && (
              <span className="block mt-1 font-medium text-red-400">
                Action required: Retrain or adjust the LSTM model immediately.
              </span>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default DriftAlert;