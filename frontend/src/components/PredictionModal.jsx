import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/services/client';
import SHAPExplanation from './SHAPExplanation';

const fetchSHAP = async (id) => {
  const response = await apiClient.get(`/shap/${id}/`);
  return response;
};

const PredictionModal = ({ prediction, isOpen, onClose }) => {
  const { data: shapData, isLoading: shapLoading } = useQuery({
    queryKey: ['shap', prediction?.id],
    queryFn: () => fetchSHAP(prediction.id),
    enabled: isOpen && !!prediction?.id,
  });

  if (!prediction) return null;

  const isCorrect = prediction.is_correct === true;
  const isIncorrect = prediction.is_correct === false;
  const isPending = prediction.is_correct === null || prediction.is_correct === undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800 bg-gray-900 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3 text-white">
            <span className="font-mono font-bold text-lg">{prediction.stock_symbol}</span>
            <Badge variant="outline" className="border-gray-700 text-gray-400">
              {new Date(prediction.date).toLocaleString()}
            </Badge>
            <Badge 
              className={cn(
                'border-0 text-xs font-medium',
                prediction.predicted_movement === 'up' 
                  ? 'bg-green-400/20 text-green-400' 
                  : prediction.predicted_movement === 'down'
                  ? 'bg-red-400/20 text-red-400'
                  : 'bg-gray-700/50 text-gray-400'
              )}
            >
              {prediction.predicted_movement?.toUpperCase() || 'NEUTRAL'}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3 text-gray-400">
            <span>Prediction: <strong className="text-white">{prediction.predicted_movement?.toUpperCase() || 'NEUTRAL'}</strong></span>
            {isCorrect && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="h-4 w-4" />
                Correct
              </span>
            )}
            {isIncorrect && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="h-4 w-4" />
                Incorrect
              </span>
            )}
            {isPending && (
              <span className="flex items-center gap-1 text-gray-500">
                <Minus className="h-4 w-4" />
                Pending
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="bg-gray-800 border border-gray-700 rounded-lg p-1 min-h-[44px]">
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 min-h-[44px] px-4 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="shap" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 min-h-[44px] px-4 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Why?
            </TabsTrigger>
            <TabsTrigger 
              value="context" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 min-h-[44px] px-4 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Confidence</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-medium text-white">{Math.round(prediction.confidence * 100)}%</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-400 transition-all"
                      style={{ width: `${Math.min(100, Math.round(prediction.confidence * 100))}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(prediction.confidence * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Actual Direction</p>
                <p className="font-medium text-white">
                  {prediction.actual_direction ? prediction.actual_direction.toUpperCase() : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Price Change</p>
                <p className="font-medium text-white">
                  {prediction.price_change_percent !== null && prediction.price_change_percent !== undefined 
                    ? `${prediction.price_change_percent}%` 
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Source</p>
                <p className="font-medium text-white">{prediction.source || 'LSTM'}</p>
              </div>
            </div>
            {prediction.headline && (
              <div>
                <p className="text-sm text-gray-400">Headline</p>
                <p className="font-medium text-white">{prediction.headline}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shap" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
            {shapLoading ? (
              <Skeleton className="h-48 w-full bg-gray-800" />
            ) : shapData ? (
              <SHAPExplanation 
                shapValues={shapData.shap_values}
                featureImportance={shapData.feature_importance}
                explanation={shapData.explanation}
              />
            ) : (
              <p className="text-gray-400">No SHAP explanation available for this prediction.</p>
            )}
          </TabsContent>

          <TabsContent value="context" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
            {prediction.market_context ? (
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">S&P 500 return:</strong> {prediction.market_context.spy_return}%</p>
                <p><strong className="text-white">SPY start:</strong> ${prediction.market_context.spy_price_start}</p>
                <p><strong className="text-white">SPY end:</strong> ${prediction.market_context.spy_price_end}</p>
              </div>
            ) : (
              <p className="text-gray-400">No market context available.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;