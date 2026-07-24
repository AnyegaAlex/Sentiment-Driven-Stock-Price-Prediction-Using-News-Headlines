// pages/Settings.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Bell, Monitor, Shield, Trash2, Code,
  AlertCircle, CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import GeneralTab from '@/components/settings/GeneralTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import DisplayTab from '@/components/settings/DisplayTab';
import SecurityTab from '@/components/settings/SecurityTab';
import AccountTab from '@/components/settings/AccountTab';
import DeveloperTab from '@/components/settings/DeveloperTab';


// ============================================================
// ✅ VALUE MAPS for backend compatibility
// ============================================================
const RISK_MAP = {
  'conservative': 'conservative',
  'moderate': 'moderate',
  'aggressive': 'aggressive',
  'high': 'aggressive',
  'low': 'conservative',
};

const GOAL_MAP = {
  'growth': 'growth',
  'income': 'income',
  'value': 'value',
  'trading': 'trading',
  'retirement': 'retirement',
};

const EXPERIENCE_MAP = {
  'beginner': 'beginner',
  'intermediate': 'intermediate',
  'advanced': 'advanced',
};


const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState(null);
  const queryClient = useQueryClient();

  // ---- Fetch Preferences ----
  const { data: preferences, isLoading, error, refetch } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/preferences/');
      return response.data || {};
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  // ---- Profile Update ----
  const profileMutation = useMutation({
    mutationFn: async (data) => {
      // ✅ FIX: Use correct endpoint '/auth/profile/'
      const response = await apiClient.patch('/auth/profile/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['profile']);
    },
  });

  // ---- Preferences Update ----
  const preferencesMutation = useMutation({
    mutationFn: async (data) => {
      // ✅ FIX: Map values before sending
      const mappedData = {
        investment_goal: GOAL_MAP[data.investment_goal] || data.investment_goal || 'growth',
        risk_tolerance: RISK_MAP[data.risk_tolerance] || data.risk_tolerance || 'moderate',
        experience_level: EXPERIENCE_MAP[data.experience_level] || data.experience_level || 'beginner',
        // ✅ Allow 'system' for theme
        theme: data.theme || 'system',
        // Notification settings
        email_notifications: data.email_notifications,
        price_alerts: data.price_alerts,
        news_alerts: data.news_alerts,
        language: data.language || 'en',
        timezone: data.timezone || 'UTC',
      };
      
      const response = await apiClient.patch('/auth/preferences/', mappedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['preferences']);
    },
  });

  // ---- Save Handlers ----
  const handleGeneralSave = async (formData) => {
    setSaveStatus({ type: 'saving', message: 'Saving...' });

    try {
      // ✅ FIX: Update profile
      await profileMutation.mutateAsync({
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        nickname: formData.nickname || '',
        bio: formData.bio || '',
      });
      
      // ✅ FIX: Update preferences with mapped values
      await preferencesMutation.mutateAsync({
        language: formData.language || 'en',
        timezone: formData.timezone || 'UTC',
        theme: formData.theme || 'system',
        investment_goal: formData.investment_goal || 'growth',
        risk_tolerance: formData.risk_tolerance || 'moderate',
        experience_level: formData.experience_level || 'beginner',
        email_notifications: formData.email_notifications !== undefined ? formData.email_notifications : true,
        price_alerts: formData.price_alerts !== undefined ? formData.price_alerts : true,
        news_alerts: formData.news_alerts !== undefined ? formData.news_alerts : true,
      });

      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('[Settings] Save error:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to save settings',
      });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handlePreferencesSave = async (formData, tab) => {
    setSaveStatus({ type: 'saving', message: 'Saving...' });

    try {
      // ✅ FIX: Map values before saving
      const mappedData = {
        investment_goal: GOAL_MAP[formData.investment_goal] || formData.investment_goal || 'growth',
        risk_tolerance: RISK_MAP[formData.risk_tolerance] || formData.risk_tolerance || 'moderate',
        experience_level: EXPERIENCE_MAP[formData.experience_level] || formData.experience_level || 'beginner',
        theme: formData.theme || 'system',
        email_notifications: formData.email_notifications !== undefined ? formData.email_notifications : true,
        price_alerts: formData.price_alerts !== undefined ? formData.price_alerts : true,
        news_alerts: formData.news_alerts !== undefined ? formData.news_alerts : true,
        language: formData.language || 'en',
        timezone: formData.timezone || 'UTC',
      };
      
      await preferencesMutation.mutateAsync(mappedData);
      setSaveStatus({ type: 'success', message: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('[Settings] Preferences save error:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to save preferences',
      });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // ---- Error State ----
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Failed to Load Settings
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {error.message || 'Unable to load your preferences'}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'developer', label: 'Developer', icon: Code },
    { id: 'account', label: 'Account', icon: Trash2 },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <Alert className={cn(
          'animate-slide-down',
          saveStatus.type === 'success' 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : saveStatus.type === 'error'
            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
        )}>
          {saveStatus.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {saveStatus.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
          {saveStatus.type === 'saving' && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          <span className={cn(
            'ml-2',
            saveStatus.type === 'success' 
              ? 'text-green-700 dark:text-green-400'
              : saveStatus.type === 'error'
              ? 'text-red-700 dark:text-red-400'
              : 'text-blue-700 dark:text-blue-400'
          )}>
            {saveStatus.message}
          </span>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
        aria-label="Settings navigation"
      >
        <TabsList className="w-full justify-start bg-transparent gap-1 border-b border-gray-200 dark:border-gray-700 rounded-none p-0 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <GeneralTab 
            preferences={preferences} 
            onSave={handleGeneralSave}
            isSaving={saveStatus?.type === 'saving'}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab 
            preferences={preferences} 
            onSave={(data) => handlePreferencesSave(data, 'notifications')}
            isSaving={saveStatus?.type === 'saving'}
          />
        </TabsContent>

        <TabsContent value="display">
          <DisplayTab 
            preferences={preferences} 
            onSave={(data) => handlePreferencesSave(data, 'display')}
            isSaving={saveStatus?.type === 'saving'}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab user={user} />
        </TabsContent>

        <TabsContent value="developer">
          <DeveloperTab />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;