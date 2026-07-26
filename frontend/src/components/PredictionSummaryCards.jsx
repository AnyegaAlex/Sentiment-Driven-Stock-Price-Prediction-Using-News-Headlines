import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

const PredictionSummaryCards = ({ data }) => {
  if (!data) return null;

  const { 
    total_predictions, 
    resolved_predictions,  
    correct_predictions, 
    overall,
    recent_accuracy 
  } = data;
  
  // Calculate accuracy based on RESOLVED predictions only
  const accuracy = resolved_predictions > 0 
    ? Math.round((correct_predictions / resolved_predictions) * 100) 
    : 0;

  const f1 = overall?.f1 || 0;
  const recentAccuracy = data?.recent_accuracy || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" role="group" aria-label="Prediction summary statistics">
      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{accuracy}%</div>
          <p className="text-xs text-gray-500">{total_predictions} verified</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">F1 Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{f1}%</div>
          <p className="text-xs text-gray-500">Balanced metric</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Total Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{total_predictions}</div>
          <p className="text-xs text-gray-500">{correct_predictions} correct</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{recentAccuracy}%</div>
          <p className="text-xs text-gray-500">Recent performance</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictionSummaryCards;