import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{prediction.stock_symbol}</span>
            <Badge variant="outline">{new Date(prediction.date).toLocaleString()}</Badge>
          </DialogTitle>
          <DialogDescription>
            Prediction: <strong>{prediction.predicted_movement?.toUpperCase()}</strong>
            {prediction.is_correct !== null && (
              <span className="ml-2">
                {prediction.is_correct ? '✅ Correct' : '❌ Incorrect'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="shap">Why?</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{Math.round(prediction.confidence * 100)}%</span>
                  <Progress value={prediction.confidence * 100} className="h-2 flex-1" />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Direction</p>
                <p className="font-medium">
                  {prediction.actual_direction ? prediction.actual_direction.toUpperCase() : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price Change</p>
                <p className="font-medium">
                  {prediction.price_change_percent !== null ? `${prediction.price_change_percent}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{prediction.source || '—'}</p>
              </div>
            </div>
            {prediction.headline && (
              <div>
                <p className="text-sm text-muted-foreground">Headline</p>
                <p className="font-medium">{prediction.headline}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shap">
            {shapLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : shapData ? (
              <SHAPExplanation 
                shapValues={shapData.shap_values}
                featureImportance={shapData.feature_importance}
                explanation={shapData.explanation}
              />
            ) : (
              <p className="text-muted-foreground">No explanation available.</p>
            )}
          </TabsContent>

          <TabsContent value="context">
            {prediction.market_context ? (
              <div className="space-y-2">
                <p><strong>S&P 500 return:</strong> {prediction.market_context.spy_return}%</p>
                <p><strong>SPY start:</strong> ${prediction.market_context.spy_price_start}</p>
                <p><strong>SPY end:</strong> ${prediction.market_context.spy_price_end}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No market context available.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;