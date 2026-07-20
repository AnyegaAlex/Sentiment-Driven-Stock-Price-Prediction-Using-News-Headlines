import React, { useState } from 'react';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';

const ViewAPIKeyModal = ({ isOpen, onClose, apiKey: initialKey }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [apiKey, setApiKey] = useState(initialKey || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/api-key/generate/');
      setApiKey(response.data.api_key);
      setCopied(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'No API key generated';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key</DialogTitle>
          <DialogDescription>
            Your API key for programmatic access to Tickflow Sentiment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your API Key</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                {isVisible ? apiKey || 'No API key generated' : maskedKey}
              </code>
              {apiKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isVisible && apiKey ? 'Keep this key secure. It provides full access to your account.' : 'Click the eye icon to reveal your API key.'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Regenerate Key'}
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-400">
              ⚠️ Regenerating your API key will invalidate the previous key immediately.
              Update any applications using this key.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAPIKeyModal;