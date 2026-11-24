/**
 * General settings – language and time zone only.
 * Name is collected during onboarding, so it is not edited here.
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const DEFAULT_VALUES = { language: 'en', timezone: 'UTC' };

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
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

const fromPrefs = (preferences) => ({
  language: preferences?.language || DEFAULT_VALUES.language,
  timezone: preferences?.timezone || DEFAULT_VALUES.timezone,
});

const GeneralTab = ({ preferences, onSave, isSaving, saveStatus: parentSaveStatus }) => {
  const [form, setForm] = useState(fromPrefs(preferences));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setForm(fromPrefs(preferences));
      setHasChanges(false);
    }
  }, [preferences]);

  useEffect(() => {
    const saved = fromPrefs(preferences);
    setHasChanges(form.language !== saved.language || form.timezone !== saved.timezone);
  }, [form, preferences]);

  const handleFieldChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) return;
    await onSave(form);
  };

  const saving = parentSaveStatus?.type === 'saving';
  const statusDisplay =
    parentSaveStatus?.type === 'success' ? { icon: CheckCircle, text: 'Saved successfully', className: 'text-green-400' }
    : parentSaveStatus?.type === 'error' ? { icon: AlertCircle, text: 'Failed to save', className: 'text-red-400' }
    : null;

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">General Settings</CardTitle>
        <CardDescription className="text-gray-400">Language and time zone used across the app</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="language" className="text-gray-300">Language</Label>
            <Select value={form.language} onValueChange={(v) => handleFieldChange('language', v)}>
              <SelectTrigger id="language" className="min-h-[44px] bg-gray-900 border-gray-800 text-white" disabled={saving}>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                {LANGUAGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="focus:bg-gray-800 focus:text-white text-gray-400 min-h-[44px]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-gray-300">Time Zone</Label>
            <Select value={form.timezone} onValueChange={(v) => handleFieldChange('timezone', v)}>
              <SelectTrigger id="timezone" className="min-h-[44px] bg-gray-900 border-gray-800 text-white" disabled={saving}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-60 overflow-y-auto">
                {TIMEZONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="focus:bg-gray-800 focus:text-white text-gray-400 min-h-[44px]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              disabled={isSaving || !hasChanges || saving}
              className="min-w-[140px] min-h-[44px] bg-white text-black hover:bg-gray-200 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(fromPrefs(preferences))}
              disabled={!hasChanges || saving}
              className="min-w-[120px] min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            {statusDisplay && (
              <span className={`flex items-center text-sm ${statusDisplay.className}`}>
                <statusDisplay.icon className="h-4 w-4 mr-1" />
                {statusDisplay.text}
              </span>
            )}
          </div>
          {hasChanges && parentSaveStatus?.type !== 'success' && (
            <p className="text-sm text-gray-400">You have unsaved changes</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default GeneralTab;
