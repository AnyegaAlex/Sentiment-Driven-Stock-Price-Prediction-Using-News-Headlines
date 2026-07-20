/**
 * Display Tab – Tickflow Sentiment
 * 
 * Phase 1 implementation:
 * - Default risk profile, hold time, and view
 * - Toggles for sentiment, technical indicators, compact mode
 * - Saves to backend via /auth/preferences/
 * 
 * All preferences are persisted and survive page reload.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DisplayTab = ({ preferences, onSave, isSaving }) => {
  // Default values – used when preferences are not yet set
  const defaultValues = {
    default_risk: 'medium',
    default_hold: 'medium-term',
    default_view: 'dashboard',
    show_sentiment: true,
    show_technicals: true,
    compact_mode: false,
  };

  // Initialize form from preferences prop (or defaults)
  const [form, setForm] = useState(defaultValues);
  const [saveStatus, setSaveStatus] = useState(null); // 'idle' | 'saving' | 'success' | 'error'

  // Update form when preferences prop changes (e.g., after save)
  useEffect(() => {
    if (preferences) {
      setForm({
        default_risk: preferences.default_risk || defaultValues.default_risk,
        default_hold: preferences.default_hold || defaultValues.default_hold,
        default_view: preferences.default_view || defaultValues.default_view,
        show_sentiment: preferences.show_sentiment ?? defaultValues.show_sentiment,
        show_technicals: preferences.show_technicals ?? defaultValues.show_technicals,
        compact_mode: preferences.compact_mode ?? defaultValues.compact_mode,
      });
    }
  }, [preferences]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await onSave(form);
      setSaveStatus('success');
      // Auto-clear success after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Preferences</CardTitle>
        <CardDescription>
          Customize how the platform looks and behaves
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_risk">Default Risk Profile</Label>
              <Select 
                value={form.default_risk} 
                onValueChange={(value) => setForm({ ...form, default_risk: value })}
              >
                <SelectTrigger id="default_risk">
                  <SelectValue placeholder="Select risk profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_hold">Default Hold Time</Label>
              <Select 
                value={form.default_hold} 
                onValueChange={(value) => setForm({ ...form, default_hold: value })}
              >
                <SelectTrigger id="default_hold">
                  <SelectValue placeholder="Select hold time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-term">Short-Term (1-4 days)</SelectItem>
                  <SelectItem value="medium-term">Medium-Term (1-4 weeks)</SelectItem>
                  <SelectItem value="long-term">Long-Term (4+ weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_view">Default View</Label>
              <Select 
                value={form.default_view} 
                onValueChange={(value) => setForm({ ...form, default_view: value })}
              >
                <SelectTrigger id="default_view">
                  <SelectValue placeholder="Select default view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="news">News Analysis</SelectItem>
                  <SelectItem value="history">Prediction History</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <Label htmlFor="show_sentiment" className="text-sm font-medium">
                  Show Sentiment
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Display sentiment indicators on stock cards
                </p>
              </div>
              <Switch
                id="show_sentiment"
                checked={form.show_sentiment}
                onCheckedChange={(checked) => setForm({ ...form, show_sentiment: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <Label htmlFor="show_technicals" className="text-sm font-medium">
                  Show Technical Indicators
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Display technical analysis indicators on charts
                </p>
              </div>
              <Switch
                id="show_technicals"
                checked={form.show_technicals}
                onCheckedChange={(checked) => setForm({ ...form, show_technicals: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <Label htmlFor="compact_mode" className="text-sm font-medium">
                  Compact Mode
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reduce spacing and padding for a denser layout
                </p>
              </div>
              <Switch
                id="compact_mode"
                checked={form.compact_mode}
                onCheckedChange={(checked) => setForm({ ...form, compact_mode: checked })}
              />
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
                Saved successfully
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

export default DisplayTab;