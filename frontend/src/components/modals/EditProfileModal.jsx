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
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update your display name and username
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name" className="text-gray-300">
              Display Name
            </Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Your display name"
              className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-300">
              Username
            </Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Your username"
              className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
            />
            <p className="text-xs text-gray-500">Usernames are unique and can be changed twice per year.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="border border-red-400 bg-red-400/10 text-red-400">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="border border-green-400 bg-green-400/10 text-green-400">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="ml-2 text-green-400">
                Profile updated successfully!
              </span>
            </Alert>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.username}
              className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;