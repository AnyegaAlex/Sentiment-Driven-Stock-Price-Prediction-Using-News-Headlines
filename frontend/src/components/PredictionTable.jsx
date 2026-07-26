import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PredictionTable = ({ predictions, total, page, limit, onPageChange, onRowClick }) => {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-800 hover:bg-transparent">
            <TableHead className="text-gray-400">Date</TableHead>
            <TableHead className="text-gray-400">Symbol</TableHead>
            <TableHead className="text-gray-400">Prediction</TableHead>
            <TableHead className="text-gray-400">Actual</TableHead>
            <TableHead className="text-gray-400">Correct?</TableHead>
            <TableHead className="text-gray-400">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {predictions.map((pred) => (
            <TableRow 
              key={pred.id} 
              className="cursor-pointer hover:bg-gray-800/50 border-b border-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              onClick={() => onRowClick(pred)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onRowClick(pred)}
            >
              <TableCell className="text-gray-300">{new Date(pred.date).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium text-white">{pred.stock_symbol}</TableCell>
              <TableCell>
                <Badge className={cn(
                  'border-0 text-xs font-medium',
                  pred.predicted_movement === 'up' 
                    ? 'bg-green-400/20 text-green-400' 
                    : 'bg-red-400/20 text-red-400'
                )}>
                  {pred.predicted_movement?.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                {pred.actual_direction ? (
                  <Badge className={cn(
                    'border-0 text-xs font-medium',
                    pred.actual_direction === 'up' 
                      ? 'bg-green-400/20 text-green-400' 
                      : 'bg-red-400/20 text-red-400'
                  )}>
                    {pred.actual_direction.toUpperCase()}
                  </Badge>
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </TableCell>
              <TableCell>
                {pred.is_correct !== null ? (
                  pred.is_correct ? (
                    <CheckCircle className="h-4 w-4 text-green-400" aria-label="Correct" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" aria-label="Incorrect" />
                  )
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </TableCell>
              <TableCell className="text-gray-300">{Math.round(pred.confidence * 100)}%</TableCell>
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
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PredictionTable;