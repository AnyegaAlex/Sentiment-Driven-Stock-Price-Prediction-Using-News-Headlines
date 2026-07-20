import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, onSuccess, user }) => {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    username: user?.username || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updateProfile(form);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name and username
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Your username"
            />
            <p className="text-xs text-gray-500">Usernames are unique and can be changed twice per year.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-slide-down">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 animate-slide-down">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="ml-2 text-green-700 dark:text-green-400">
                Profile updated successfully!
              </span>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.username}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;