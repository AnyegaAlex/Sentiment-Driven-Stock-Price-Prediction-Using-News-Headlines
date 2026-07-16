import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PredictionTable = ({ predictions, total, page, limit, onPageChange, onRowClick }) => {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Prediction</TableHead>
            <TableHead>Actual</TableHead>
            <TableHead>Correct?</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {predictions.map((pred) => (
            <TableRow 
              key={pred.id} 
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => onRowClick(pred)}
            >
              <TableCell>{new Date(pred.date).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{pred.stock_symbol}</TableCell>
              <TableCell>
                <Badge variant={pred.predicted_movement === 'up' ? 'success' : 'destructive'}>
                  {pred.predicted_movement?.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                {pred.actual_direction ? (
                  <Badge variant={pred.actual_direction === 'up' ? 'success' : 'destructive'}>
                    {pred.actual_direction.toUpperCase()}
                  </Badge>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </TableCell>
              <TableCell>
                {pred.is_correct !== null ? (
                  pred.is_correct ? (
                    <span className="text-green-500">✅</span>
                  ) : (
                    <span className="text-red-500">❌</span>
                  )
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell>{Math.round(pred.confidence * 100)}%</TableCell>
            </TableRow>
          ))}
          {predictions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No predictions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PredictionTable;