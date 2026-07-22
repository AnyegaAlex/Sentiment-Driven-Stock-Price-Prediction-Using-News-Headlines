/**
 * Notifications Tab – Tickflow Sentiment
 * 
 * Manages user notification preferences.
 * 
 * Features:
 * - Toggle switches for all notification types
 * - Real-time updates
 * - Dark mode support
 * - Accessibility
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Constants
const DEFAULT_VALUES = {
  email_notifications: true,
  price_alerts: false,
  sentiment_alerts: false,
  product_updates: true,
  weekly_digest: true,
  research_reports: false,
};

const NOTIFICATIONS = [
  {
    id: 'email_notifications',
    label: 'Email Notifications',
    description: 'Receive email updates about your account and activity',
    default: true,
  },
  {
    id: 'price_alerts',
    label: 'Price Alerts',
    description: 'Get notified when stocks reach your target prices',
    default: false,
  },
  {
    id: 'sentiment_alerts',
    label: 'Sentiment Alerts',
    description: 'Receive alerts when sentiment shifts significantly',
    default: false,
  },
  {
    id: 'product_updates',
    label: 'Product Updates',
    description: 'Stay informed about new features and improvements',
    default: true,
  },
  {
    id: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Receive a summary of your activity and key insights',
    default: true,
  },
  {
    id: 'research_reports',
    label: 'Research Reports',
    description: 'Get notified when new research reports are published',
    default: false,
  },
];

const NotificationsTab = ({ preferences, onSave, isSaving, saveStatus: parentSaveStatus }) => {
  // Form state
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with preferences
  useEffect(() => {
    if (preferences) {
      setForm({
        email_notifications: preferences.email_notifications ?? DEFAULT_VALUES.email_notifications,
        price_alerts: preferences.price_alerts ?? DEFAULT_VALUES.price_alerts,
        sentiment_alerts: preferences.sentiment_alerts ?? DEFAULT_VALUES.sentiment_alerts,
        product_updates: preferences.product_updates ?? DEFAULT_VALUES.product_updates,
        weekly_digest: preferences.weekly_digest ?? DEFAULT_VALUES.weekly_digest,
        research_reports: preferences.research_reports ?? DEFAULT_VALUES.research_reports,
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

  // Handle toggle change
  const handleToggle = (id, checked) => {
    setForm(prev => ({ ...prev, [id]: checked }));
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

  // Count enabled notifications
  const enabledCount = Object.values(form).filter(Boolean).length;
  const totalCount = NOTIFICATIONS.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {enabledCount} of {totalCount} enabled
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Notification Toggles */}
          <div className="space-y-4">
            {NOTIFICATIONS.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors",
                  form[item.id] 
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="space-y-0.5">
                  <Label htmlFor={item.id} className="text-sm font-medium">
                    {item.label}
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
                <Switch
                  id={item.id}
                  checked={form[item.id]}
                  onCheckedChange={(checked) => handleToggle(item.id, checked)}
                  disabled={parentSaveStatus?.type === 'saving'}
                />
              </div>
            ))}
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

export default NotificationsTab;