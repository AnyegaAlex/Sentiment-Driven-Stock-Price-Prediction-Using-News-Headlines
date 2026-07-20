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

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const NotificationsTab = ({ preferences, onSave, isSaving }) => {
  const [form, setForm] = useState({
    email_notifications: preferences?.email_notifications ?? true,
    price_alerts: preferences?.price_alerts ?? false,
    sentiment_alerts: preferences?.sentiment_alerts ?? false,
    product_updates: preferences?.product_updates ?? true,
    weekly_digest: preferences?.weekly_digest ?? true,
    research_reports: preferences?.research_reports ?? false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const notifications = [
    {
      id: 'email_notifications',
      label: 'Email Notifications',
      description: 'Receive email updates about your account and activity',
    },
    {
      id: 'price_alerts',
      label: 'Price Alerts',
      description: 'Get notified when stocks reach your target prices',
    },
    {
      id: 'sentiment_alerts',
      label: 'Sentiment Alerts',
      description: 'Receive alerts when sentiment shifts significantly',
    },
    {
      id: 'product_updates',
      label: 'Product Updates',
      description: 'Stay informed about new features and improvements',
    },
    {
      id: 'weekly_digest',
      label: 'Weekly Digest',
      description: 'Receive a summary of your activity and key insights',
    },
    {
      id: 'research_reports',
      label: 'Research Reports',
      description: 'Get notified when new research reports are published',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {notifications.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  onCheckedChange={(checked) => setForm({ ...form, [item.id]: checked })}
                />
              </div>
            ))}
          </div>

          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationsTab;