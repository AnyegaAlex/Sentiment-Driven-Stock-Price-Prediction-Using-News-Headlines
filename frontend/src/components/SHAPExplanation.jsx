import React from 'react';
import { Progress } from '@/components/ui/progress';

const SHAPExplanation = ({ shapValues, featureImportance, explanation }) => {
  if (!shapValues || Object.keys(shapValues).length === 0) {
    return <p className="text-muted-foreground">No SHAP data available.</p>;
  }

  const features = Object.entries(shapValues)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  const maxAbs = Math.max(...features.map(([_, v]) => Math.abs(v)), 0.01);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Top Contributors</div>
      {features.map(([feature, value]) => {
        const pct = (Math.abs(value) / maxAbs) * 100;
        const color = value > 0 ? 'bg-green-500' : 'bg-red-500';
        return (
          <div key={feature} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
              <span className={value > 0 ? 'text-green-500' : 'text-red-500'}>
                {value > 0 ? '+' : ''}{value.toFixed(2)}
              </span>
            </div>
            <Progress value={pct} className="h-2" indicatorClassName={color} />
          </div>
        );
      })}
      {explanation && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
          <p className="text-muted-foreground">{explanation}</p>
        </div>
      )}
    </div>
  );
};

export default SHAPExplanation;