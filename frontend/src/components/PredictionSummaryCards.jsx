import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

const PredictionSummaryCards = ({ data }) => {
  if (!data) return null;
  const { total_predictions, correct_predictions, overall } = data;
  const accuracy = overall?.accuracy || 0;
  const f1 = overall?.f1 || 0;
  const recentAccuracy = data?.recent_accuracy || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{accuracy}%</div>
          <p className="text-xs text-muted-foreground">{total_predictions} verified</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">F1 Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{f1}%</div>
          <p className="text-xs text-muted-foreground">Balanced metric</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total_predictions}</div>
          <p className="text-xs text-muted-foreground">{correct_predictions} correct</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentAccuracy}%</div>
          <p className="text-xs text-muted-foreground">Recent performance</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictionSummaryCards;