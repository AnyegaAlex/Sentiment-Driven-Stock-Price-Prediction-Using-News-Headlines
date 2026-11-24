import PropTypes from 'prop-types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityMap = {
  low: {
    icon: AlertTriangle,
    title: 'Small performance decline',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-800/30',
    textColor: 'text-gray-300',
    guidance: 'Review recent predictions and monitor the next evaluation window.',
  },
  medium: {
    icon: AlertCircle,
    title: 'Performance has declined',
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-800/50',
    textColor: 'text-gray-200',
    guidance: 'Review recent predictions and investigate what changed before relying on this model.',
  },
  high: {
    icon: AlertCircle,
    title: 'Significant performance decline',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-400/10',
    textColor: 'text-red-400',
    guidance: 'Treat the model output with caution until the decline has been investigated.',
  },
};

const DriftAlert = ({ severity, drop }) => {
  const info = severityMap[severity] || severityMap.low;
  const Icon = info.icon;
  const hasDrop = drop !== null && drop !== undefined && Number.isFinite(Number(drop));

  return (
    <Alert
      className={cn(
        'rounded-lg border-l-4 border-l-current',
        info.borderColor,
        info.bgColor,
        'text-white'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', info.textColor)} aria-hidden="true" />
        <div>
          <AlertTitle className={cn('font-semibold text-white', info.textColor)}>
            {info.title}
          </AlertTitle>
          <AlertDescription className={cn('text-sm', info.textColor === 'text-red-400' ? 'text-red-400/90' : 'text-gray-400')}>
            {hasDrop
              ? `Performance is down ${Number(drop).toFixed(1)}% compared with the baseline. `
              : 'A change in model performance was detected, but the size of the change is unavailable. '}
            {info.guidance}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

DriftAlert.propTypes = {
  severity: PropTypes.oneOf(['low', 'medium', 'high']),
  drop: PropTypes.number,
};

export default DriftAlert;
