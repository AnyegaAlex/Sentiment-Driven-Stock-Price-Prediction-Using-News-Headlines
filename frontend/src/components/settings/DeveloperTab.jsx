import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Key, Plus, Trash2, RefreshCw, Clock, AlertCircle } from 'lucide-react';

const DeveloperTab = () => {
  const [newKeyName, setNewKeyName] = useState('');
  const [showRawKey, setShowRawKey] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await api.get('/auth/api-keys/');
      return res.data || [];
    },
  });

  // Fetch usage stats
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await api.get('/auth/usage/');
      return res.data || [];
    },
  });

  // Fetch top symbols – we'll replace with real tracking later, but keep as placeholder
  // For now, we'll show a message that it's coming soon.
  const { data: topSymbols, isLoading: symbolsLoading } = useQuery({
    queryKey: ['top-symbols'],
    queryFn: async () => {
      const res = await api.get('/auth/top-symbols/');
      return res.data || [];
    },
    // We'll keep it for now
  });

  // Fetch activity log
  const { data: activities, isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await api.get('/auth/activity/');
      return res.data || [];
    },
  });

  // Generate new key
  const generateMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post('/auth/api-keys/', { name });
      return res.data;
    },
    onSuccess: (data) => {
      setShowRawKey(data.raw_key);
      setNewKeyName('');
      setError(null);
      queryClient.invalidateQueries(['api-keys']);
      setTimeout(() => setShowRawKey(null), 10000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to generate key');
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    },
  });

  // Revoke key
  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/auth/api-keys/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['api-keys']);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to revoke key');
      setTimeout(() => setError(null), 5000);
    },
  });

  const handleGenerate = () => {
    if (!newKeyName.trim()) {
      setError('Please enter a key name');
      setTimeout(() => setError(null), 3000);
      return;
    }
    generateMutation.mutate(newKeyName.trim());
  };

  const handleRevoke = (id) => {
    if (window.confirm('Revoke this API key? It will stop working immediately.')) {
      revokeMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Key */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Key name (e.g., Production Frontend)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}
          {showRawKey && (
            <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 mb-4">
              <Key className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
              <span className="ml-2 font-mono font-bold">{showRawKey}</span>
              <span className="ml-2 text-sm text-yellow-700 dark:text-yellow-400">
                — Copy this now. You won't see it again.
              </span>
            </Alert>
          )}
          {keysLoading ? (
            <div className="text-sm text-gray-500">Loading keys...</div>
          ) : keys?.length === 0 ? (
            <div className="text-sm text-gray-500">No API keys yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key (preview)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys?.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">…{key.key_preview}</TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}</TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? 'default' : 'destructive'}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(key.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="text-xs text-gray-400 mt-2">
            You can have up to 5 active API keys.
          </div>
        </CardContent>
      </Card>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="text-sm text-gray-500">Loading usage data...</div>
          ) : usage?.length === 0 ? (
            <div className="text-sm text-gray-500">No usage data yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Symbols & Activity Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Symbols</CardTitle>
          </CardHeader>
          <CardContent>
            {symbolsLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : topSymbols?.length === 0 ? (
              <div className="text-sm text-gray-500">No symbol data yet.</div>
            ) : (
              <ul className="space-y-2">
                {topSymbols?.slice(0, 5).map((item) => (
                  <li key={item.symbol} className="flex justify-between items-center">
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-sm text-gray-500">{item.count} requests</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            {activityLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : activities?.length === 0 ? (
              <div className="text-sm text-gray-500">No activity yet.</div>
            ) : (
              <ul className="space-y-3">
                {activities?.map((act, idx) => (
                  <li key={idx} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{act.action}</span>
                      <span className="text-xs text-gray-400">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    {act.details && Object.keys(act.details).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.entries(act.details).map(([k, v]) => (
                          <span key={k} className="mr-2">{k}: {JSON.stringify(v)}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeveloperTab;