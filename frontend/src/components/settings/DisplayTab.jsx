/**
 * Display Tab – Tickflow Intelligence
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
import { Save, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Constants
const DEFAULT_VALUES = {
  risk_tolerance: 'medium',
  default_hold: 'medium-term',
  default_view: 'dashboard',
  show_sentiment: true,
  show_technicals: true,
  compact_mode: false,
};

const RISK_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const HOLD_OPTIONS = [
  { value: 'short-term', label: 'Short-Term (1-4 days)' },
  { value: 'medium-term', label: 'Medium-Term (1-4 weeks)' },
  { value: 'long-term', label: 'Long-Term (4+ weeks)' },
];

const VIEW_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'news', label: 'News Analysis' },
  { value: 'history', label: 'Prediction History' },
];

const DisplayTab = ({ preferences, onSave, isSaving, saveStatus: parentSaveStatus }) => {
  // Form state
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from preferences prop
  useEffect(() => {
    if (preferences) {
      setForm({
        risk_tolerance: preferences.risk_tolerance || DEFAULT_VALUES.risk_tolerance,
        default_hold: preferences.default_hold || DEFAULT_VALUES.default_hold,
        default_view: preferences.default_view || DEFAULT_VALUES.default_view,
        show_sentiment: preferences.show_sentiment ?? DEFAULT_VALUES.show_sentiment,
        show_technicals: preferences.show_technicals ?? DEFAULT_VALUES.show_technicals,
        compact_mode: preferences.compact_mode ?? DEFAULT_VALUES.compact_mode,
      });
      setHasChanges(false);
    }
  }, [preferences]);

  // Detect changes
  useEffect(() => {
    if (!preferences) return;
    
    const hasChanged = Object.keys(DEFAULT_VALUES).some(key => {
      const currentValue = form[key];
      const defaultValue = preferences[key] ?? DEFAULT_VALUES[key];
      return currentValue !== defaultValue;
    });
    
    setHasChanges(hasChanged);
  }, [form, preferences]);

  // Reset to defaults
  const handleReset = () => {
    setForm(DEFAULT_VALUES);
    setHasChanges(true);
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) return;
    
    await onSave(form);
  };

  // Determine save status display
  const getSaveStatusDisplay = () => {
    if (parentSaveStatus?.type === 'saving') {
      return { icon: null, text: 'Saving...', className: 'text-gray-400' };
    }
    if (parentSaveStatus?.type === 'success') {
      return { icon: CheckCircle, text: 'Saved successfully', className: 'text-green-400' };
    }
    if (parentSaveStatus?.type === 'error') {
      return { icon: AlertCircle, text: 'Failed to save', className: 'text-red-400' };
    }
    return null;
  };

  const statusDisplay = getSaveStatusDisplay();

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Display Preferences</CardTitle>
        <CardDescription className="text-gray-400">
          Customize how the platform looks and behaves
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="risk_tolerance" className="text-gray-300">Default Risk Profile</Label>
              <Select 
                value={form.risk_tolerance} 
                onValueChange={(value) => handleFieldChange('risk_tolerance', value)}
              >
                <SelectTrigger id="risk_tolerance" className="min-h-[44px] bg-gray-900 border-gray-800 text-white focus:ring-gray-500 focus:ring-offset-black">
                  <SelectValue placeholder="Select risk profile" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  {RISK_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_hold" className="text-gray-300">Default Hold Time</Label>
              <Select 
                value={form.default_hold} 
                onValueChange={(value) => handleFieldChange('default_hold', value)}
              >
                <SelectTrigger id="default_hold" className="min-h-[44px] bg-gray-900 border-gray-800 text-white focus:ring-gray-500 focus:ring-offset-black">
                  <SelectValue placeholder="Select hold time" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  {HOLD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_view" className="text-gray-300">Default View</Label>
              <Select 
                value={form.default_view} 
                onValueChange={(value) => handleFieldChange('default_view', value)}
              >
                <SelectTrigger id="default_view" className="min-h-[44px] bg-gray-900 border-gray-800 text-white focus:ring-gray-500 focus:ring-offset-black">
                  <SelectValue placeholder="Select default view" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  {VIEW_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900">
              <div>
                <Label htmlFor="show_sentiment" className="text-sm font-medium text-white">
                  Show Sentiment
                </Label>
                <p className="text-sm text-gray-400">
                  Display sentiment indicators on stock cards
                </p>
              </div>
              <Switch
                id="show_sentiment"
                checked={form.show_sentiment}
                onCheckedChange={(checked) => handleFieldChange('show_sentiment', checked)}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-700 min-h-[44px] min-w-[44px]"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900">
              <div>
                <Label htmlFor="show_technicals" className="text-sm font-medium text-white">
                  Show Technical Indicators
                </Label>
                <p className="text-sm text-gray-400">
                  Display technical analysis indicators on charts
                </p>
              </div>
              <Switch
                id="show_technicals"
                checked={form.show_technicals}
                onCheckedChange={(checked) => handleFieldChange('show_technicals', checked)}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-700 min-h-[44px] min-w-[44px]"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900">
              <div>
                <Label htmlFor="compact_mode" className="text-sm font-medium text-white">
                  Compact Mode
                </Label>
                <p className="text-sm text-gray-400">
                  Reduce spacing and padding for a denser layout
                </p>
              </div>
              <Switch
                id="compact_mode"
                checked={form.compact_mode}
                onCheckedChange={(checked) => handleFieldChange('compact_mode', checked)}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-700 min-h-[44px] min-w-[44px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              type="submit" 
              disabled={isSaving || !hasChanges || parentSaveStatus?.type === 'saving'}
              className="min-w-[140px] min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="min-w-[120px] min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-sm text-gray-400">
              You have unsaved changes
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default DisplayTab;