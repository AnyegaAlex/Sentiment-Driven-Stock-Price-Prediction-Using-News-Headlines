// pages/Profile.jsx
/**
 * User Profile Page
 * 
 * Displays complete user information including:
 * - Personal info (avatar, name, email, bio, nickname)
 * - Account status (verified, onboarded, tier, persona)
 * - Statistics (analyses, predictions, news, accuracy)
 * - Watchlist with stock badges
 * - Preferences summary (investment goal, risk tolerance, experience)
 * - Account status (active/deletion pending)
 * - Quick action buttons
 * 
 * Features:
 * - Optimized data fetching with React Query (no redundant calls)
 * - Real-time profile updates via context
 * - Loading and error states with skeletons
 * - Responsive design with Tailwind
 * - Event tracking for analytics
 * 
 * @version 3.0.0
 * @component
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Mail,
  Calendar,
  BarChart3,
  TrendingUp,
  Newspaper,
  Key,
  Edit,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle,
  Plus,
  Target,
  Shield,
  Award,
  Activity,
  Users,
  Star,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/utils/analytics';
import EditProfileModal from '@/components/modals/EditProfileModal';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import ViewAPIKeyModal from '@/components/modals/ViewAPIKeyModal';

// ============================================================================
// Constants
// ============================================================================

const PERSONA_MAP = {
  trader: 'Trader',
  researcher: 'Quant Researcher',
  developer: 'Developer',
  analyst: 'Financial Analyst',
  student: 'Student',
};

const INVESTMENT_GOAL_MAP = {
  growth: 'Growth',
  income: 'Income',
  value: 'Value Investing',
  trading: 'Active Trading',
  retirement: 'Retirement',
};

const RISK_TOLERANCE_MAP = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

const EXPERIENCE_MAP = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * UserAvatar – Renders a circular avatar with user initials
 */
const UserAvatar = ({ username, className }) => {
  const initials = useMemo(() => {
    if (!username) return 'U';
    return username.slice(0, 2).toUpperCase();
  }, [username]);

  return (
    <div
      className={cn(
        'flex h-20 w-20 items-center justify-center rounded-full border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-purple-500/20',
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
UserAvatar.propTypes = {
  username: PropTypes.string,
  className: PropTypes.string,
};

/**
 * StatCard – Displays a single statistic with icon
 */
const StatCard = ({ icon: Icon, label, value, subtitle, className }) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50',
      className
    )}
  >
    <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
      )}
    </div>
  </div>
);

StatCard.displayName = 'StatCard';
StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  className: PropTypes.string,
};

/**
 * ActionButton – A consistent action button with icon
 */
const ActionButton = ({ icon: Icon, label, onClick, variant = 'outline', loading = false }) => (
  <Button
    variant={variant}
    onClick={onClick}
    disabled={loading}
    className="flex min-w-[140px] flex-1 items-center gap-2"
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
ActionButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.string,
  loading: PropTypes.bool,
};

/**
 * PreferenceBadge – Displays a single user preference
 */
const PreferenceBadge = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
    {Icon && <Icon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />}
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
    <span className="text-xs font-medium text-gray-900 dark:text-white">{value}</span>
  </div>
);

PreferenceBadge.displayName = 'PreferenceBadge';
PreferenceBadge.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

// ============================================================================
// Main Component
// ============================================================================

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAPIKeyModalOpen, setIsAPIKeyModalOpen] = useState(false);

  // ============================================================================
  // React Query
  // ============================================================================

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      // The API returns the user object directly
      // apiClient already unwraps the response
      return await apiClient.get('/auth/profile/');
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user,
    initialData: user,
    placeholderData: user,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleEditProfile = useCallback(() => {
    trackEvent('profile_edit_clicked');
    setIsEditModalOpen(true);
  }, []);

  const handleChangePassword = useCallback(() => {
    trackEvent('profile_change_password_clicked');
    setIsPasswordModalOpen(true);
  }, []);

  const handleViewAPIKey = useCallback(() => {
    trackEvent('profile_view_api_key_clicked');
    setIsAPIKeyModalOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    trackEvent('profile_logout_clicked');
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleProfileUpdate = useCallback(async () => {
    await refreshUser();
    await refetch();
    trackEvent('profile_updated');
  }, [refreshUser, refetch]);

  const handleSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // ============================================================================
  // Data Preparation
  // ============================================================================

  const data = profile || user || {};

  const displayName = useMemo(() => {
    if (data.first_name) {
      return `${data.first_name}${data.last_name ? ` ${data.last_name}` : ''}`;
    }
    return data.nickname || data.username || 'User';
  }, [data.first_name, data.last_name, data.nickname, data.username]);

  const memberSince = useMemo(() => {
    if (!data.created_at) return 'N/A';
    return new Date(data.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [data.created_at]);

  const personaLabel = data.persona ? PERSONA_MAP[data.persona] || data.persona : null;
  const investmentGoal = data.investment_goal ? INVESTMENT_GOAL_MAP[data.investment_goal] : null;
  const riskTolerance = data.risk_tolerance ? RISK_TOLERANCE_MAP[data.risk_tolerance] : null;
  const experienceLevel = data.experience_level ? EXPERIENCE_MAP[data.experience_level] : null;

  const isDeletionPending = data.deletion_scheduled_for && new Date(data.deletion_scheduled_for) > new Date();
  const deletionDate = isDeletionPending
    ? new Date(data.deletion_scheduled_for).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading && !profile) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
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

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* ============================================================
          Page Header
          ============================================================ */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account information and settings
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* ============================================================
          User Info Card
          ============================================================ */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {/* Avatar */}
            <UserAvatar username={data.username} />

            {/* User Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {displayName}
                </h2>
                {data.tier && data.tier !== 'free' && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 capitalize dark:border-amber-800 dark:from-amber-900/20 dark:to-amber-800/20"
                  >
                    <Star className="mr-1 h-3 w-3 text-amber-500" />
                    {data.tier} Plan
                  </Badge>
                )}
                {personaLabel && (
                  <Badge
                    variant="outline"
                    className="border-purple-200 bg-purple-50 capitalize dark:border-purple-800 dark:bg-purple-900/20"
                  >
                    <Users className="mr-1 h-3 w-3" />
                    {personaLabel}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  @{data.username || 'username'}
                </span>
                <span className="hidden text-gray-300 dark:text-gray-600 sm:inline">•</span>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="h-3.5 w-3.5" />
                  {data.email || 'email@example.com'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {data.email_verified ? (
                  <Badge className="border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400"
                  >
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Unverified
                  </Badge>
                )}
                {data.onboarded && (
                  <Badge className="border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Award className="mr-1 h-3 w-3" />
                    Onboarded
                  </Badge>
                )}
                <Badge variant="outline" className="text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  Member since {memberSince}
                </Badge>
              </div>

              {data.nickname && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Nickname:</span> {data.nickname}
                </p>
              )}

              {data.bio && (
                <p className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
                  {data.bio}
                </p>
              )}

              {isDeletionPending && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Account deletion scheduled for <strong>{deletionDate}</strong>. 
                      You can cancel this in Settings.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
          Quick Stats
          ============================================================ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={BarChart3}
          label="Analyses"
          value={data.analyses_count || 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Predictions"
          value={data.predictions_count || 0}
          subtitle={`${data.prediction_accuracy || 0}% accuracy`}
        />
        <StatCard
          icon={Newspaper}
          label="News Read"
          value={data.news_read_count || 0}
        />
        <StatCard
          icon={Activity}
          label="Watchlist"
          value={data.watchlist?.length || 0}
          subtitle={`${data.watchlist?.length || 0} stocks tracked`}
        />
      </div>

      {/* ============================================================
          Watchlist Section
          ============================================================ */}
      {data.watchlist && data.watchlist.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-blue-500" />
                Watchlist
              </CardTitle>
              <CardDescription>Stocks you're tracking</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Plus className="h-4 w-4" />
              Add More
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.watchlist.map((symbol) => (
                <Badge
                  key={symbol}
                  variant="secondary"
                  className="cursor-default border border-gray-200 px-3 py-1.5 font-mono text-sm transition-colors hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900/30"
                >
                  {symbol}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              {data.watchlist.length} {data.watchlist.length === 1 ? 'stock' : 'stocks'} being tracked
            </p>
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          Preferences Section
          ============================================================ */}
      {(investmentGoal || riskTolerance || experienceLevel) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-blue-500" />
              Preferences
            </CardTitle>
            <CardDescription>Your investment profile and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {investmentGoal && (
                <PreferenceBadge
                  label="Goal"
                  value={investmentGoal}
                  icon={Target}
                />
              )}
              {riskTolerance && (
                <PreferenceBadge
                  label="Risk"
                  value={riskTolerance}
                  icon={Shield}
                />
              )}
              {experienceLevel && (
                <PreferenceBadge
                  label="Experience"
                  value={experienceLevel}
                  icon={Award}
                />
              )}
              {data.persona && (
                <PreferenceBadge
                  label="Persona"
                  value={personaLabel}
                  icon={Users}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          Action Buttons
          ============================================================ */}
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
          icon={Settings}
          label="Settings"
          onClick={handleSettings}
          variant="outline"
        />
        <ActionButton
          icon={LogOut}
          label="Logout"
          onClick={handleLogout}
          variant="ghost"
        />
      </div>

      {/* ============================================================
          Security Notice
          ============================================================ */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Account Security
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              For your security, sensitive actions require password verification.
              You can change your password, view your API key, or manage your account in Settings.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          Modals
          ============================================================ */}
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

export default React.memo(Profile);