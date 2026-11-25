// pages/Settings.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Bell, Shield, Trash2, Code,
  AlertCircle, CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActionErrorMessage } from '@/utils/errorHandler';
import GeneralTab from '@/components/settings/GeneralTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import SecurityTab from '@/components/settings/SecurityTab';
import AccountTab from '@/components/settings/AccountTab';
import DeveloperTab from '@/components/settings/DeveloperTab';


// ============================================================
// VALUE MAPS for backend compatibility
// ============================================================
const LANGUAGE_CODES = {
  english: 'en', spanish: 'es', french: 'fr', german: 'de', portuguese: 'pt',
  italian: 'it', japanese: 'ja', korean: 'ko', chinese: 'zh',
};

const toLanguageCode = (value) => {
  if (!value) return undefined;
  const v = String(value).trim().toLowerCase();
  if (/^[a-z]{2}$/.test(v)) return v;
  return LANGUAGE_CODES[v];
};

// Only send fields the user actually set, in the shape the backend validates.
const buildPreferencePayload = (data = {}) => {
  const payload = {};
  if (data.theme) payload.theme = data.theme;
  ['email_notifications', 'price_alerts', 'news_alerts', 'weekly_digest'].forEach((key) => {
    if (typeof data[key] === 'boolean') payload[key] = data[key];
  });
  const language = toLanguageCode(data.language);
  if (language) payload.language = language;
  if (data.timezone) payload.timezone = data.timezone;
  return payload;
};


const Settings = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const validTabs = ['general', 'notifications', 'security', 'developer', 'account'];
  const [activeTab, setActiveTab] = useState(validTabs.includes(requestedTab) ? requestedTab : 'general');
  const [saveStatus, setSaveStatus] = useState(null);
  const queryClient = useQueryClient();

  // ---- Fetch Preferences ----
  const { data: preferences, isLoading, error, refetch } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/preferences/');
      return response?.data ?? response ?? {};
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  // ---- Preferences Update ----
  const preferencesMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch('/auth/preferences/', buildPreferencePayload(data));
      return response?.data ?? response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  // ---- Save Handlers ----
  const handleGeneralSave = async (formData) => {
    setSaveStatus({ type: 'saving', message: 'Saving...' });

    try {
      await preferencesMutation.mutateAsync({
        language: formData.language,
        timezone: formData.timezone,
      });

      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('[Settings] Save error:', error);
      setSaveStatus({
        type: 'error',
        message: getActionErrorMessage(error, 'We couldn’t save your settings. Please try again.'),
      });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handlePreferencesSave = async (formData) => {
    setSaveStatus({ type: 'saving', message: 'Saving...' });

    try {
      await preferencesMutation.mutateAsync(formData);
      setSaveStatus({ type: 'success', message: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('[Settings] Preferences save error:', error);
      setSaveStatus({
        type: 'error',
        message: getActionErrorMessage(error, 'We couldn’t save your preferences. Please try again.'),
      });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48 bg-gray-800" />
        <Skeleton className="h-12 w-full bg-gray-800" />
        <Skeleton className="h-96 w-full bg-gray-800" />
      </div>
    );
  }

  // ---- Error State ----
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <Card className="border border-red-400 bg-gray-900">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">
              Failed to Load Settings
            </h3>
            <p className="text-gray-400 mt-2">
              {getActionErrorMessage(error, 'We couldn’t load your settings. Please try again.')}
            </p>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              className="mt-4 border-white text-white hover:bg-white hover:text-black min-h-[44px]"
            >
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
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'developer', label: 'Developer', icon: Code },
    { id: 'account', label: 'Account', icon: Trash2 },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 bg-black text-white">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400">
          Manage your account, notifications, security and developer access.
        </p>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div
          role={saveStatus.type === 'error' ? 'alert' : 'status'}
          aria-live={saveStatus.type === 'error' ? 'assertive' : 'polite'}
          className={cn(
          'flex items-center gap-2 p-4 rounded-lg border animate-slide-down',
          saveStatus.type === 'success' 
            ? 'border-green-400 bg-green-400/10 text-green-400'
            : saveStatus.type === 'error'
            ? 'border-red-400 bg-red-400/10 text-red-400'
            : 'border-gray-500 bg-gray-800/50 text-gray-300'
        )}>
          {saveStatus.type === 'success' && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
          {saveStatus.type === 'error' && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {saveStatus.type === 'saving' && (
            <div className="h-4 w-4 flex-shrink-0 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
        aria-label="Settings navigation"
      >
        <TabsList className="w-full justify-start bg-transparent gap-1 border-b border-gray-800 rounded-none p-0 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-4 py-2 text-gray-400 hover:text-white data-[state=active]:border-b-2 data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent rounded-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          <GeneralTab 
            preferences={preferences} 
            onSave={handleGeneralSave}
            isSaving={saveStatus?.type === 'saving'}
          />
        </TabsContent>

        <TabsContent value="notifications" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          <NotificationsTab 
            preferences={preferences} 
            onSave={handlePreferencesSave}
            isSaving={saveStatus?.type === 'saving'}
          />
        </TabsContent>

        <TabsContent value="security" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          <SecurityTab user={user} />
        </TabsContent>

        <TabsContent value="developer" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          <DeveloperTab />
        </TabsContent>

        <TabsContent value="account" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;