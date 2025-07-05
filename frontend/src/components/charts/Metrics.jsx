import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import api from '@/services/api';

const ModelMetrics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['modelMetrics'],
    queryFn: () => api.get('/model/metrics/').then(res => res.data)
  });

  if (isLoading) return <p>Loading metrics...</p>;
  if (error) return <p>Error loading metrics</p>;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Model Evaluation Metrics</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>Accuracy: <strong>{(data.accuracy * 100).toFixed(2)}%</strong></div>
        <div>Precision: <strong>{(data.precision * 100).toFixed(2)}%</strong></div>
        <div>Recall: <strong>{(data.recall * 100).toFixed(2)}%</strong></div>
        <div>F1 Score: <strong>{(data.f1_score * 100).toFixed(2)}%</strong></div>
      </CardContent>
    </Card>
  );
};

export default ModelMetrics;
