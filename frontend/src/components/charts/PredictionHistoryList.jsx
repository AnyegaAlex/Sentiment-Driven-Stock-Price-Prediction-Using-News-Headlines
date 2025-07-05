import { Table } from '@/components/ui/table';
import { format } from 'date-fns';

const PredictionHistoryList = ({ predictions }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Prediction</th>
            <th>Confidence</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map(pred => (
            <tr key={pred.id}>
              <td>{format(new Date(pred.created_at), 'MMM dd, yyyy HH:mm')}</td>
              <td className="capitalize">{pred.prediction}</td>
              <td>{(pred.confidence * 100).toFixed(1)}%</td>
              <td>{pred.source}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default PredictionHistoryList;