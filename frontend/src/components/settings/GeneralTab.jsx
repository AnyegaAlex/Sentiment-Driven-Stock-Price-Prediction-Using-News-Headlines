// components/settings/GeneralTab.jsx
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const GeneralTab = ({ preferences, onSave, isSaving }) => {
  const { user } = useAuth();

  // Build form state from user + preferences
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    language: preferences?.language || 'en',
    timezone: preferences?.timezone || 'UTC',
    theme: preferences?.theme || 'system',
  });

  const [saveStatus, setSaveStatus] = useState(null); // 'idle' | 'saving' | 'success' | 'error'

  // Sync with external changes (e.g., after profile update)
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (preferences) {
      setForm(prev => ({
        ...prev,
        language: preferences.language || 'en',
        timezone: preferences.timezone || 'UTC',
        theme: preferences.theme || 'system',
      }));
    }
  }, [preferences]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await onSave(form);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your basic account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={form.language} 
              onValueChange={(value) => setForm({ ...form, language: value })}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Time Zone</Label>
            <Select 
              value={form.timezone} 
              onValueChange={(value) => setForm({ ...form, timezone: value })}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-4">
              {['light', 'dark', 'system'].map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setForm({ ...form, theme })}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-all capitalize',
                    form.theme === theme 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSaving || saveStatus === 'saving'} className="min-w-[140px]">
              {saveStatus === 'saving' ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            {saveStatus === 'success' && (
              <span className="flex items-center text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                Failed to save
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GeneralTab;