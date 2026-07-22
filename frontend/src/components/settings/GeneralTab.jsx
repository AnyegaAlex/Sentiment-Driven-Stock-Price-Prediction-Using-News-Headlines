// components/settings/GeneralTab.jsx
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Constants
const DEFAULT_VALUES = {
  language: 'en',
  timezone: 'UTC',
  theme: 'system',
};

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'pt', label: 'Portuguese' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const GeneralTab = ({ preferences, onSave, isSaving, saveStatus: parentSaveStatus }) => {
  const { user } = useAuth();

  // Form state
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    language: preferences?.language || DEFAULT_VALUES.language,
    timezone: preferences?.timezone || DEFAULT_VALUES.timezone,
    theme: preferences?.theme || DEFAULT_VALUES.theme,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync with user changes
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      }));
    }
  }, [user]);

  // Sync with preferences changes
  useEffect(() => {
    if (preferences) {
      setForm(prev => ({
        ...prev,
        language: preferences.language || DEFAULT_VALUES.language,
        timezone: preferences.timezone || DEFAULT_VALUES.timezone,
        theme: preferences.theme || DEFAULT_VALUES.theme,
      }));
    }
  }, [preferences]);

  // Detect changes
  useEffect(() => {
    if (!user && !preferences) return;

    const hasChanged = 
      form.first_name !== (user?.first_name || '') ||
      form.last_name !== (user?.last_name || '') ||
      form.language !== (preferences?.language || DEFAULT_VALUES.language) ||
      form.timezone !== (preferences?.timezone || DEFAULT_VALUES.timezone) ||
      form.theme !== (preferences?.theme || DEFAULT_VALUES.theme);
    
    setHasChanges(hasChanged);
  }, [form, user, preferences]);

  // Validate form
  const validate = () => {
    const newErrors = {};

    // Name validation (optional but with limits)
    if (form.first_name && form.first_name.length > 50) {
      newErrors.first_name = 'First name must be less than 50 characters';
    }
    if (form.last_name && form.last_name.length > 50) {
      newErrors.last_name = 'Last name must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset to defaults
  const handleReset = () => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      language: preferences?.language || DEFAULT_VALUES.language,
      timezone: preferences?.timezone || DEFAULT_VALUES.timezone,
      theme: preferences?.theme || DEFAULT_VALUES.theme,
    });
    setHasChanges(false);
    setErrors({});
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    if (!hasChanges) return;

    await onSave(form);
  };

  // Determine save status display
  const getSaveStatusDisplay = () => {
    if (parentSaveStatus?.type === 'saving') {
      return { icon: null, text: 'Saving...', className: 'text-blue-600 dark:text-blue-400' };
    }
    if (parentSaveStatus?.type === 'success') {
      return { icon: CheckCircle, text: 'Saved successfully', className: 'text-green-600 dark:text-green-400' };
    }
    if (parentSaveStatus?.type === 'error') {
      return { icon: AlertCircle, text: 'Failed to save', className: 'text-red-600 dark:text-red-400' };
    }
    return null;
  };

  const statusDisplay = getSaveStatusDisplay();

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
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name
                <span className="text-xs text-gray-400 ml-1">(optional)</span>
              </Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
                placeholder="Your first name"
                maxLength={50}
                className={cn(errors.first_name && 'border-red-500 dark:border-red-500')}
                disabled={parentSaveStatus?.type === 'saving'}
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name
                <span className="text-xs text-gray-400 ml-1">(optional)</span>
              </Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
                placeholder="Your last name"
                maxLength={50}
                className={cn(errors.last_name && 'border-red-500 dark:border-red-500')}
                disabled={parentSaveStatus?.type === 'saving'}
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={form.language} 
              onValueChange={(value) => handleFieldChange('language', value)}
            >
              <SelectTrigger id="language" disabled={parentSaveStatus?.type === 'saving'}>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Zone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Time Zone</Label>
            <Select 
              value={form.timezone} 
              onValueChange={(value) => handleFieldChange('timezone', value)}
            >
              <SelectTrigger id="timezone" disabled={parentSaveStatus?.type === 'saving'}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex flex-wrap gap-4">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => handleFieldChange('theme', theme.value)}
                  disabled={parentSaveStatus?.type === 'saving'}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-all capitalize',
                    form.theme === theme.value 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    parentSaveStatus?.type === 'saving' && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              type="submit" 
              disabled={isSaving || !hasChanges || parentSaveStatus?.type === 'saving'}
              className="min-w-[140px]"
            >
              {parentSaveStatus?.type === 'saving' ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || parentSaveStatus?.type === 'saving'}
              className="min-w-[120px]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            {/* Save Status */}
            {statusDisplay && (
              <span className={cn(
                'flex items-center text-sm',
                statusDisplay.className
              )}>
                {statusDisplay.icon && <statusDisplay.icon className="h-4 w-4 mr-1" />}
                {statusDisplay.text}
              </span>
            )}
          </div>

          {/* Unsaved Changes Indicator */}
          {hasChanges && parentSaveStatus?.type !== 'success' && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              You have unsaved changes
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default GeneralTab;