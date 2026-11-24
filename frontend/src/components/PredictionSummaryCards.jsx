import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PredictionSummaryCards = ({ data }) => {
  if (!data) return null;

  const resolvedCount = Number(data.resolved_predictions) || 0;
  const correctCount = Number(data.correct_predictions) || 0;
  const accuracy = resolvedCount > 0
    ? Math.round((correctCount / resolvedCount) * 100)
    : null;

  const f1 = resolvedCount > 0 && Number.isFinite(data.overall?.f1)
    ? data.overall.f1
    : null;

  const recentResolved = Array.isArray(data.series)
    ? Number(data.series[data.series.length - 1]?.resolved) || 0
    : 0;
  const recentAccuracy = recentResolved > 0 && Number.isFinite(data.recent_accuracy)
    ? data.recent_accuracy
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" role="group" aria-label="Prediction summary statistics">
      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{accuracy === null ? '—' : `${accuracy}%`}</div>
          <p className="text-xs text-gray-500">
            {resolvedCount > 0 ? `Based on ${resolvedCount} resolved predictions` : 'No resolved predictions yet'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">F1 Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{f1 === null ? '—' : `${f1}%`}</div>
          <p className="text-xs text-gray-500">
            {f1 === null ? 'Requires resolved predictions' : 'Balance of precision and recall'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Resolved Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{resolvedCount}</div>
          <p className="text-xs text-gray-500">{correctCount} correct</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {recentAccuracy === null ? '—' : `${recentAccuracy}%`}
          </div>
          <p className="text-xs text-gray-500">
            {recentResolved > 0 ? `Based on ${recentResolved} resolved predictions` : 'No resolved predictions in this period'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

PredictionSummaryCards.propTypes = {
  data: PropTypes.shape({
    resolved_predictions: PropTypes.number,
    correct_predictions: PropTypes.number,
    overall: PropTypes.shape({
      f1: PropTypes.number,
    }),
    recent_accuracy: PropTypes.number,
    series: PropTypes.arrayOf(PropTypes.shape({
      resolved: PropTypes.number,
    })),
  }),
};

export default PredictionSummaryCards;
