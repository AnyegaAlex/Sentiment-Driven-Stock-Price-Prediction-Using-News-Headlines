// pages/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Calendar, 
  Award, 
  BarChart3, 
  TrendingUp, 
  Newspaper,
  Key,
  Edit,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/utils/analytics';
import EditProfileModal from '@/components/modals/EditProfileModal';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import ViewAPIKeyModal from '@/components/modals/ViewAPIKeyModal';

// ============================================================================
// Sub-Components
// ============================================================================

const UserAvatar = ({ username, className }) => {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : 'U';
  
  return (
    <div 
      className={cn(
        'w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border-2 border-blue-500/30',
        className
      )}
      aria-label={`Avatar for ${username || 'User'}`}
    >
      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        {initials}
      </span>
    </div>
  );
};

UserAvatar.displayName = 'UserAvatar';

const StatCard = ({ icon: Icon, label, value, className }) => (
  <div className={cn(
    'flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50',
    className
  )}>
    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

StatCard.displayName = 'StatCard';

const ActionButton = ({ icon: Icon, label, onClick, variant = 'outline', loading = false }) => (
  <Button
    variant={variant}
    onClick={onClick}
    disabled={loading}
    className="flex-1 min-w-[140px]"
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading...
      </span>
    ) : (
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    )}
  </Button>
);

ActionButton.displayName = 'ActionButton';

// ============================================================================
// Main Component
// ============================================================================

const Profile = () => {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAPIKeyModalOpen, setIsAPIKeyModalOpen] = useState(false);

  // Use React Query to fetch profile (optional – user from context is already available)
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/profile/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!user,
    initialData: user, // Use context user as initial data
  });

  const handleEditProfile = () => {
    trackEvent('profile_edit_clicked');
    setIsEditModalOpen(true);
  };

  const handleChangePassword = () => {
    trackEvent('profile_change_password_clicked');
    setIsPasswordModalOpen(true);
  };

  const handleViewAPIKey = () => {
    trackEvent('profile_view_api_key_clicked');
    setIsAPIKeyModalOpen(true);
  };

  const handleLogout = () => {
    trackEvent('profile_logout_clicked');
    logout();
    navigate('/login');
  };

  const handleProfileUpdate = async () => {
    await refreshProfile(); // Refresh context
    await refetch(); // Refresh query
    trackEvent('profile_updated');
  };

  // ---- Loading State ----
  if (isLoading && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (error && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Failed to Load Profile
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {error.message || 'Please try again later.'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use profile data (from query) or fallback to user from context
  const data = profile || user || {};
  
  // Display name: use first_name + last_name, or nickname, or username
  const displayName = data.first_name 
    ? `${data.first_name}${data.last_name ? ` ${data.last_name}` : ''}`
    : data.nickname || data.username || 'User';
  
  const memberSince = data.created_at 
    ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  // Persona display name
  const personaMap = {
    trader: 'Trader',
    researcher: 'Quant Researcher',
    developer: 'Developer',
    analyst: 'Financial Analyst',
    student: 'Student',
  };
  const personaLabel = data.persona ? personaMap[data.persona] || data.persona : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account information and settings
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <UserAvatar username={data.username} />

            {/* User Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {displayName}
                </h2>
                {data.tier && data.tier !== 'free' && (
                  <Badge variant="outline" className="capitalize">
                    {data.tier} Plan
                  </Badge>
                )}
                {personaLabel && (
                  <Badge variant="outline" className="capitalize bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    {personaLabel}
                  </Badge>
                )}
                {data.email_verified ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 dark:text-yellow-400 dark:border-yellow-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )}
                {data.onboarded && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    Onboarded
                  </Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  @{data.username || 'username'}
                </span>
                {data.nickname && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">nickname:</span>
                      {data.nickname}
                    </span>
                  </>
                )}
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {data.email || 'email@example.com'}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              </div>

              {data.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                  {data.bio}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={BarChart3}
          label="Analyses"
          value={data.analyses_count || 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Predictions"
          value={data.predictions_count || 0}
        />
        <StatCard
          icon={Newspaper}
          label="News Read"
          value={data.news_read_count || 0}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          icon={Edit}
          label="Edit Profile"
          onClick={handleEditProfile}
        />
        <ActionButton
          icon={Lock}
          label="Change Password"
          onClick={handleChangePassword}
          variant="outline"
        />
        <ActionButton
          icon={Key}
          label="API Key"
          onClick={handleViewAPIKey}
          variant="outline"
        />
        <ActionButton
          icon={LogOut}
          label="Logout"
          onClick={handleLogout}
          variant="ghost"
        />
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              Account Security
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              For your security, sensitive actions require password verification.
              You can change your password or view your API key at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleProfileUpdate}
        user={data}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ViewAPIKeyModal
        isOpen={isAPIKeyModalOpen}
        onClose={() => setIsAPIKeyModalOpen(false)}
        apiKey={data.api_key}
      />
    </div>
  );
};

export default Profile;