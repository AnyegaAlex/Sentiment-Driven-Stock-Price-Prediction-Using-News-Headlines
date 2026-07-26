/**
 * Developer Settings Tab - v4.4.0
 *
 * A shadcn/ui-native developer dashboard with:
 * - API Key management (create, list, revoke)
 * - Usage analytics with rate limit warnings
 * - API Explorer using generated keys
 * - Documentation with quick start examples
 *
 * @version 4.4.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/services/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Shield,
  Zap,
  BookOpen,
  Terminal,
  BarChart3,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMITS = {
  free: { daily: 100, label: 'Free', color: 'text-gray-400' },
  pro: { daily: 5000, label: 'Pro', color: 'text-gray-300' },
  enterprise: { daily: 'Unlimited', label: 'Enterprise', color: 'text-white' },
};

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/stock-analysis/',
    description: 'Unified stock analysis with sentiment and technicals.',
    params: [{ name: 'symbol', required: true, example: 'AAPL' }],
  },
  {
    method: 'GET',
    path: '/technical-indicators/',
    description: 'Get technical indicators for a symbol.',
    params: [{ name: 'symbol', required: true, example: 'AAPL' }],
  },
  {
    method: 'GET',
    path: '/news/get-news/',
    description: 'Get news articles with FinBERT sentiment analysis.',
    params: [{ name: 'symbol', required: true, example: 'AAPL' }],
  },
  {
    method: 'GET',
    path: '/lstm-predict/',
    description: 'Get LSTM-based price predictions.',
    params: [{ name: 'symbol', required: true, example: 'AAPL' }],
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

const StatCard = ({ title, value, icon: Icon, description, trend }) => (
  <Card className="bg-gray-900 border border-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{value}</div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {trend && <div className="mt-1 text-xs text-gray-500">{trend}</div>}
    </CardContent>
  </Card>
);

const ApiKeyTable = ({ keys, onRevoke, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full bg-gray-800" />
        <Skeleton className="h-10 w-full bg-gray-800" />
        <Skeleton className="h-10 w-full bg-gray-800" />
      </div>
    );
  }

  if (!keys || keys.length === 0) {
    return (
      <Card className="border-dashed border-gray-700 bg-gray-900">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
          <Key className="mb-2 h-8 w-8 text-gray-500" />
          <p className="text-sm font-medium text-gray-400">No API keys yet</p>
          <p className="text-xs text-gray-500">Generate your first key to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border border-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-800 hover:bg-transparent">
            <TableHead className="text-gray-400">Name</TableHead>
            <TableHead className="hidden sm:table-cell text-gray-400">Key Preview</TableHead>
            <TableHead className="hidden md:table-cell text-gray-400">Created</TableHead>
            <TableHead className="hidden lg:table-cell text-gray-400">Last Used</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-right text-gray-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id} className="border-b border-gray-800 hover:bg-gray-800/50">
              <TableCell className="font-medium text-white">{key.name}</TableCell>
              <TableCell className="hidden sm:table-cell font-mono text-xs text-gray-400">
                …{key.key_preview}
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-gray-400">
                {new Date(key.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-gray-400">
                {key.last_used
                  ? new Date(key.last_used).toLocaleString()
                  : 'Never'}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    'border-0 text-xs font-medium',
                    key.is_active
                      ? 'bg-green-400/20 text-green-400'
                      : 'bg-red-400/20 text-red-400'
                  )}
                >
                  {key.is_active ? 'Active' : 'Revoked'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {key.is_active && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRevoke(key.id, key.name)}
                          className="h-9 w-9 text-red-400 hover:bg-red-400/10 hover:text-red-300 focus-visible:ring-gray-500 focus-visible:ring-offset-black min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Revoke API Key</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="border border-gray-800 bg-gray-900 text-white">
                        <p>Revoke API Key</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const UsageChart = ({ data, isLoading, tier }) => {
  const rateLimit = RATE_LIMITS[tier] || RATE_LIMITS.free;
  const totalRequests = data?.reduce((sum, day) => sum + day.count, 0) || 0;
  const todayRequests = data?.[data.length - 1]?.count || 0;
  const usagePercent = rateLimit.daily !== 'Unlimited' 
    ? Math.min((todayRequests / rateLimit.daily) * 100, 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full bg-gray-800" />
        <Skeleton className="h-4 w-3/4 bg-gray-800" />
      </div>
    );
  }

  const hasData = data && data.some((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={BarChart3}
        />
        <StatCard
          title="Today"
          value={todayRequests.toLocaleString()}
          icon={Zap}
        />
        <StatCard
          title="Daily Limit"
          value={rateLimit.daily === 'Unlimited' ? '∞' : rateLimit.daily.toLocaleString()}
          icon={Shield}
        />
        <StatCard
          title="Remaining"
          value={rateLimit.daily === 'Unlimited' ? '∞' : (rateLimit.daily - todayRequests).toLocaleString()}
          description={rateLimit.daily !== 'Unlimited' ? 'Resets at midnight UTC' : ''}
          icon={Info}
        />
      </div>

      {rateLimit.daily !== 'Unlimited' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Daily usage</span>
            <span className={cn(
              'font-medium',
              usagePercent > 80 ? 'text-red-400' : usagePercent > 60 ? 'text-gray-400' : 'text-green-400'
            )}>
              {usagePercent.toFixed(0)}%
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className={cn(
                'absolute left-0 top-0 h-full rounded-full transition-all',
                usagePercent > 80 ? 'bg-red-400' : usagePercent > 60 ? 'bg-gray-500' : 'bg-green-400'
              )}
              style={{ width: `${usagePercent}%` }}
              role="progressbar"
              aria-valuenow={usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {usagePercent > 80 && (
            <div className="border border-red-400/30 bg-red-400/10 rounded-md p-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-xs text-red-400">
                  You're approaching your daily limit. Consider upgrading to Pro.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasData ? (
        <Card className="border-dashed border-gray-700 bg-gray-900">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
            <BarChart3 className="mb-2 h-8 w-8 text-gray-500" />
            <p className="text-sm font-medium text-gray-400">No usage data yet</p>
            <p className="text-xs text-gray-500">Start making API requests to see analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  borderColor: '#1F2937',
                  color: '#FFFFFF',
                }}
                labelStyle={{ color: '#FFFFFF' }}
                itemStyle={{ color: '#D1D5DB' }}
              />
              <Bar dataKey="count" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const ApiExplorer = ({ user, apiKeys }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS[0]);
  const [params, setParams] = useState({});
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const activeKey = apiKeys?.find(k => k.is_active);

  const handleParamChange = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const executeRequest = useCallback(async () => {
    if (!activeKey) {
      toast({
        title: "No Active API Key",
        description: "Please generate an API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const queryParams = new URLSearchParams();
      selectedEndpoint.params.forEach((param) => {
        if (params[param.name]) {
          queryParams.append(param.name, params[param.name]);
        }
      });

      const response = await apiClient.get(
        `${selectedEndpoint.path}?${queryParams.toString()}`
      );
      setResponse(response);
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEndpoint, params, toast, activeKey]);

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Endpoint List */}
      <Card className="md:col-span-1 bg-gray-900 border border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm text-white">Endpoints</CardTitle>
          <CardDescription className="text-gray-400">Select an endpoint to test</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64 rounded-b-lg">
            <div className="space-y-1 p-2">
              {API_ENDPOINTS.map((endpoint) => (
                <Button
                  key={endpoint.path}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-left font-mono text-xs min-h-[44px]',
                    selectedEndpoint === endpoint
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                  onClick={() => {
                    setSelectedEndpoint(endpoint);
                    setParams({});
                    setResponse(null);
                    setError(null);
                  }}
                >
                  <Badge
                    className={cn(
                      'mr-2 text-[10px] border-0',
                      endpoint.method === 'GET'
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    )}
                  >
                    {endpoint.method}
                  </Badge>
                  <span className="truncate">{endpoint.path}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Request & Response Area */}
      <Card className="md:col-span-2 bg-gray-900 border border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm text-white">Request</CardTitle>
          <CardDescription className="text-gray-400">
            Configure parameters and execute the request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Status */}
          <div className={cn(
            "flex items-center gap-2 rounded-md border p-2 text-sm",
            activeKey
              ? "border-green-400/30 bg-green-400/10"
              : "border-gray-700 bg-gray-800/50"
          )}>
            {activeKey ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400">
                  Using API Key: {activeKey.name}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">
                  No active API key found. Generate one in the API Keys tab.
                </span>
              </>
            )}
          </div>

          <div className="space-y-2">
            {selectedEndpoint.params.map((param) => (
              <div key={param.name} className="flex items-center gap-2">
                <span className="w-24 font-mono text-xs font-medium text-gray-300">
                  {param.name}
                  {param.required && (
                    <span className="ml-1 text-red-400">*</span>
                  )}
                </span>
                <Input
                  placeholder={param.example}
                  value={params[param.name] || ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="h-8 flex-1 text-xs min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={executeRequest}
              disabled={isLoading}
              size="sm"
              className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Terminal className="mr-2 h-3 w-3" />
                  Execute Request
                </>
              )}
            </Button>
            {!activeKey && (
              <span className="text-xs text-gray-500">
                Generate an API key first
              </span>
            )}
          </div>

          {(response || error) && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Response</p>
                {response && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(response, null, 2))
                    }
                    className="h-7 gap-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 min-h-[44px]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="rounded-md bg-gray-800 p-4 font-mono text-xs text-gray-300">
                <pre className="whitespace-pre-wrap break-all">
                  {error
                    ? JSON.stringify(error, null, 2)
                    : JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const DeveloperTab = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState('');
  const [showRawKey, setShowRawKey] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('keys');
  const queryClient = useQueryClient();

  // --- Queries ---
  const {
    data: keys = [],
    isLoading: keysLoading,
    refetch: refetchKeys,
  } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/api-keys/');
        console.log('[DeveloperTab] Fetched keys:', res);
        return res || [];
      } catch (err) {
        console.warn('[DeveloperTab] Failed to fetch API keys:', err);
        return [];
      }
    },
    staleTime: 0,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled: !!user && isAuthenticated,
  });

  useEffect(() => {
    if (user && isAuthenticated) {
      refetchKeys();
    }
  }, [user, isAuthenticated, refetchKeys]);

  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/usage/');
      return res.data || [];
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: topSymbols = [], isLoading: symbolsLoading } = useQuery({
    queryKey: ['top-symbols'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/top-symbols/');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: activitiesData, isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/activity/');
      return res.data?.results || res.data || [];
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const usage = Array.isArray(usageData) ? usageData : [];
  const activities = Array.isArray(activitiesData) ? activitiesData : [];
  const keysList = Array.isArray(keys) ? keys : [];

  useEffect(() => {
    console.log('[DeveloperTab] keysList updated:', keysList);
    console.log('[DeveloperTab] keysList length:', keysList.length);
  }, [keysList]);

  // --- Mutations ---
  const generateMutation = useMutation({
    mutationFn: async (name) => {
      const res = await apiClient.post('/auth/api-keys/', { name });
      return res.data;
    },
    onSuccess: (data) => {
      console.log('[DeveloperTab] Key generated:', data);
      
      setShowRawKey(data.raw_key);
      setNewKeyName('');
      setError(null);
      
      refetchKeys();
      
      queryClient.setQueryData(['api-keys'], (oldData) => {
        const newKey = {
          id: data.id,
          name: data.name,
          key_preview: data.raw_key ? data.raw_key.slice(-8) : '',
          created_at: data.created_at,
          last_used: null,
          is_active: true,
        };
        const currentKeys = Array.isArray(oldData) ? oldData : [];
        console.log('[DeveloperTab] Updating cache with new key:', newKey);
        return [...currentKeys, newKey];
      });
      
      toast({
        title: "API Key Generated",
        description: `Key "${data.name}" created successfully. Copy it now.`,
      });
      
      setTimeout(() => setShowRawKey(null), 15000);
    },
    onError: (err) => {
      const message = err.response?.data?.error || 'Failed to generate key. Please try again.';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setTimeout(() => setError(null), 5000);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/auth/api-keys/${id}/`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Key Revoked",
        description: "API key has been permanently revoked.",
      });
      
      queryClient.setQueryData(['api-keys'], (oldData) => {
        const currentKeys = Array.isArray(oldData) ? oldData : [];
        return currentKeys.filter((key) => key.id !== variables);
      });
      
      refetchKeys();
    },
    onError: (err) => {
      const message = err.response?.data?.error || 'Failed to revoke key. Please try again.';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setTimeout(() => setError(null), 5000);
    },
  });

  // --- Handlers ---
  const handleGenerate = () => {
    if (!newKeyName.trim()) {
      setError('Please enter a key name');
      toast({
        title: "Validation Error",
        description: "Please enter a key name.",
        variant: "destructive",
      });
      setTimeout(() => setError(null), 3000);
      return;
    }
    generateMutation.mutate(newKeyName.trim());
  };

  const handleRevoke = (id, name) => {
    if (window.confirm(`Revoke API key "${name}"? It will stop working immediately.`)) {
      revokeMutation.mutate(id);
    }
  };

  const handleRefreshAll = () => {
    refetchKeys();
    refetchUsage();
    toast({
      title: "Refreshed",
      description: "All data has been refreshed.",
    });
  };

  const userTier = user?.tier || 'free';
  const rateLimit = RATE_LIMITS[userTier] || RATE_LIMITS.free;
  const activeKeyCount = keysList.filter((k) => k.is_active).length;

  return (
    <div className="space-y-6">
      {/* --- Header --- */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Developer Settings</h2>
          <p className="text-sm text-gray-400">
            Manage API keys, monitor usage, and test endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1 border-gray-700 text-gray-400">
            <Shield className="h-3 w-3" />
            {rateLimit.label} Plan
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshAll}
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Refresh all data</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border border-gray-800 bg-gray-900 text-white">
                <p>Refresh all data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* --- Error Alert --- */}
      {error && (
        <Alert variant="destructive" className="border border-red-400/30 bg-red-400/10 text-red-400">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-white">Error</AlertTitle>
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* --- Tabs --- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 p-1 rounded-lg">
          <TabsTrigger
            value="keys"
            className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md px-3 py-1.5 min-h-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
          >
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger
            value="usage"
            className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md px-3 py-1.5 min-h-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Usage</span>
          </TabsTrigger>
          <TabsTrigger
            value="explorer"
            className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md px-3 py-1.5 min-h-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
          >
            <Terminal className="h-4 w-4" />
            <span className="hidden sm:inline">Explorer</span>
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md px-3 py-1.5 min-h-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* --- Tab 1: API Keys --- */}
        <TabsContent value="keys" className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
          <Card className="bg-gray-900 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Manage API Keys</CardTitle>
              <CardDescription className="text-gray-400">
                Create and manage API keys for programmatic access.
                You can have up to 5 active keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Key name (e.g., Production Frontend)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="sm:max-w-sm min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerate();
                  }}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              {showRawKey && (
                <Alert className="border-gray-700 bg-gray-800 text-white">
                  <Key className="h-4 w-4 text-gray-400" />
                  <AlertTitle className="text-white">
                    New API Key Created
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="break-all font-mono text-sm font-bold text-gray-300">
                      {showRawKey}
                    </p>
                    <p className="text-xs text-gray-500">
                      Copy this key now. It will not be shown again for security.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(showRawKey);
                        toast({
                          title: "Copied!",
                          description: "API key copied to clipboard.",
                        });
                      }}
                      className="mt-1 h-7 gap-1 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white min-h-[44px]"
                    >
                      <Copy className="h-3 w-3" /> Copy to clipboard
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <ApiKeyTable
                keys={keysList}
                onRevoke={handleRevoke}
                isLoading={keysLoading}
              />
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 px-6 py-4">
              <p className="text-xs text-gray-500">
                <Shield className="mr-1 inline-block h-3 w-3" />
                Keys are hashed and never stored in plain text.
              </p>
              <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-400 border-0">
                {activeKeyCount} / 5 active
              </Badge>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- Tab 2: Usage --- */}
        <TabsContent value="usage" className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
          <Card className="bg-gray-900 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">API Usage</CardTitle>
              <CardDescription className="text-gray-400">
                Track your API request usage over the last 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsageChart
                data={usage}
                isLoading={usageLoading}
                tier={userTier}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Symbols */}
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm text-white">Top Symbols</CardTitle>
                <CardDescription className="text-gray-400">Most frequently analyzed stocks</CardDescription>
              </CardHeader>
              <CardContent>
                {symbolsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full bg-gray-800" />
                    <Skeleton className="h-8 w-full bg-gray-800" />
                    <Skeleton className="h-8 w-full bg-gray-800" />
                  </div>
                ) : topSymbols.length === 0 ? (
                  <p className="text-sm text-gray-500">No symbol data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topSymbols.slice(0, 5).map((item) => (
                      <li
                        key={item.symbol}
                        className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2"
                      >
                        <span className="font-mono text-sm font-medium text-white">
                          {item.symbol}
                        </span>
                        <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-400 border-0">
                          {item.count} requests
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm text-white">Recent Activity</CardTitle>
                <CardDescription className="text-gray-400">Last 10 actions on your account</CardDescription>
              </CardHeader>
              <CardContent className="max-h-72 overflow-y-auto">
                {activityLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full bg-gray-800" />
                    <Skeleton className="h-12 w-full bg-gray-800" />
                    <Skeleton className="h-12 w-full bg-gray-800" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-500">No activity yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activities.slice(0, 10).map((act, idx) => (
                      <li
                        key={idx}
                        className="border-b border-gray-800 pb-3 text-sm last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-medium text-white">
                            {act.action === 'LOGIN_SUCCESS' && (
                              <CheckCircle className="h-3 w-3 text-green-400" />
                            )}
                            {act.action === 'API_KEY_CREATED' && (
                              <Key className="h-3 w-3 text-gray-400" />
                            )}
                            {act.action}
                          </span>
                          <span className="text-xs text-gray-500">
                            {act.timestamp
                              ? new Date(act.timestamp).toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                        {act.details && Object.keys(act.details).length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {Object.entries(act.details).map(([k, v]) => (
                              <span key={k} className="mr-2">
                                {k}: {typeof v === 'string' ? v : JSON.stringify(v)}
                              </span>
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
        </TabsContent>

        {/* --- Tab 3: API Explorer --- */}
        <TabsContent value="explorer" className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
          <ApiExplorer user={user} apiKeys={keysList} />
        </TabsContent>

        {/* --- Tab 4: Documentation --- */}
        <TabsContent value="docs" className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
          <Card className="bg-gray-900 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">API Documentation</CardTitle>
              <CardDescription className="text-gray-400">
                Complete API reference with interactive Swagger UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  onClick={() =>
                    window.open(
                      'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/',
                      '_blank'
                    )
                  }
                  className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Swagger UI
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines',
                      '_blank'
                    )
                  }
                  className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  GitHub Repository
                </Button>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                <h4 className="mb-2 text-sm font-medium text-white">Quick Start Examples</h4>
                <div className="space-y-2 text-sm">
                  {API_ENDPOINTS.map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className="flex items-center gap-2 rounded-md bg-gray-900 p-2"
                    >
                      <Badge
                        className={cn(
                          'border-0 text-[10px]',
                          endpoint.method === 'GET'
                            ? 'bg-green-400/20 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        )}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="flex-1 text-xs text-gray-300">{endpoint.path}</code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800 min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
                              onClick={() => {
                                navigator.clipboard?.writeText(
                                  `${import.meta.env.VITE_API_BASE_URL}${endpoint.path}?symbol=AAPL`
                                );
                                toast({
                                  title: "Copied!",
                                  description: "URL copied to clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              <span className="sr-only">Copy URL</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="border border-gray-800 bg-gray-900 text-white">
                            <p>Copy full URL</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                <h4 className="mb-2 text-sm font-medium text-white">Authentication</h4>
                <p className="text-sm text-gray-400">
                  All API requests require a Bearer token in the Authorization header:
                </p>
                <code className="mt-2 block rounded bg-gray-900 p-2 text-xs text-gray-300">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <p className="mt-2 text-sm text-gray-400">
                  Generate your API key in the "API Keys" tab above.
                </p>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                <h4 className="mb-2 text-sm font-medium text-white">Rate Limits</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>• Free Plan: 100 requests per day</li>
                  <li>• Pro Plan: 5,000 requests per day</li>
                  <li>• Enterprise Plan: Unlimited</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperTab;