import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/services/client';
import { getActionErrorMessage } from '@/utils/errorHandler';
import { trackEvent } from '@/utils/analytics';
import { cn } from '@/lib/utils';
import {
  User, Mail, Calendar, BarChart3, TrendingUp, Newspaper, Key,
  Edit, Lock, LogOut, CheckCircle, AlertCircle, Plus, Target,
  Shield, Award, Activity, Users, Star, AlertTriangle, Settings,
  Loader2,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EditProfileModal from '@/components/modals/EditProfileModal';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';

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

const UserAvatar = ({ username }) => {
  const initials = username ? username.slice(0, 2).toUpperCase() : 'U';
  return (
    <div
      role="img"
      aria-label={'Avatar for ' + (username || 'user')}
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-gray-700 bg-gray-800"
    >
      <span className="text-2xl font-bold text-gray-300">{initials}</span>
    </div>
  );
};
UserAvatar.propTypes = { username: PropTypes.string };

const StatCard = ({ icon: Icon, label, value, subtitle }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
    <div className="rounded-lg bg-gray-800 p-2">
      <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);
StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
};

const ActionButton = ({ icon: Icon, label, onClick, variant = 'outline', loading = false }) => (
  <Button
    type="button"
    variant={variant}
    onClick={onClick}
    disabled={loading}
    className="flex min-h-[44px] min-w-[140px] flex-1 items-center justify-center gap-2"
  >
    {loading
      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      : <Icon className="h-4 w-4" aria-hidden="true" />}
    {loading ? 'Signing out…' : label}
  </Button>
);
ActionButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.string,
  loading: PropTypes.bool,
};

const PreferenceBadge = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2">
    {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />}
    <span className="text-xs text-gray-500">{label}:</span>
    <span className="text-xs font-medium text-white">{value}</span>
  </div>
);
PreferenceBadge.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    data: profile,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => apiClient.get('/auth/profile/'),
    enabled: Boolean(user?.id),
    placeholderData: user,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const data = useMemo(() => ({
    ...(user || {}),
    ...(profile || {}),
  }), [user, profile]);

  const displayName = useMemo(() => {
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
    return fullName || data.nickname || data.username || 'User';
  }, [data.first_name, data.last_name, data.nickname, data.username]);

  const memberSince = useMemo(() => {
    if (!data.created_at) return 'Not available';
    const date = new Date(data.created_at);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
  }, [data.created_at]);

  const personaLabel = data.persona ? (PERSONA_MAP[data.persona] || data.persona) : null;
  const investmentGoal = data.investment_goal
    ? (INVESTMENT_GOAL_MAP[data.investment_goal] || data.investment_goal)
    : null;
  const riskTolerance = data.risk_tolerance
    ? (RISK_TOLERANCE_MAP[data.risk_tolerance] || data.risk_tolerance)
    : null;
  const experienceLevel = data.experience_level
    ? (EXPERIENCE_MAP[data.experience_level] || data.experience_level)
    : null;

  const deletionDateValue = data.deletion_scheduled_for ? new Date(data.deletion_scheduled_for) : null;
  const isDeletionPending = deletionDateValue && !Number.isNaN(deletionDateValue.getTime()) && deletionDateValue > new Date();
  const deletionDate = isDeletionPending
    ? new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(deletionDateValue)
    : null;

  const handleEditProfile = useCallback(() => {
    trackEvent('profile_edit_clicked');
    setIsEditModalOpen(true);
  }, []);

  const handleChangePassword = useCallback(() => {
    trackEvent('profile_change_password_clicked');
    setIsPasswordModalOpen(true);
  }, []);

  const handleViewAPIKey = useCallback(() => {
    trackEvent('profile_manage_api_keys_clicked');
    navigate('/settings?tab=developer');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    trackEvent('profile_sign_out_clicked');
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  const handleProfileUpdate = useCallback(async () => {
    await refreshUser();
    await refetch();
    trackEvent('profile_updated');
  }, [refreshUser, refetch]);

  const handleSettings = useCallback(() => navigate('/settings'), [navigate]);

  if (isLoading && !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 bg-black p-4 md:p-6" aria-label="Loading profile">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full bg-gray-800" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48 bg-gray-800" />
            <Skeleton className="h-4 w-32 bg-gray-800" />
            <Skeleton className="h-4 w-40 bg-gray-800" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl bg-gray-800" />
          <Skeleton className="h-24 rounded-xl bg-gray-800" />
          <Skeleton className="h-24 rounded-xl bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error && !profile && !user) {
    return (
      <div className="mx-auto max-w-4xl bg-black p-4 md:p-6">
        <Card className="border border-red-400/40 bg-gray-900">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">We couldn’t load your profile</h2>
            <p className="mt-2 text-sm text-gray-400">
              {getActionErrorMessage(error, 'Your account is still active. Try loading these details again.')}
            </p>
            <Button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              className="mt-5 min-h-[44px] border-gray-600 text-white hover:bg-gray-800"
            >
              {isFetching ? 'Retrying…' : 'Try again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const watchlist = Array.isArray(data.watchlist) ? data.watchlist : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 bg-black p-4 text-white md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="mt-1 text-sm text-gray-400">Your account details and research preferences</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSettings}
          className="min-h-[44px] gap-2 border-gray-700 text-white hover:bg-gray-800"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Button>
      </div>

      {error && profile && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          <span>We couldn’t refresh your profile. The details shown may be out of date.</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[40px] border-amber-400/40 text-amber-100 hover:bg-amber-400/10"
          >
            {isFetching ? 'Refreshing…' : 'Retry'}
          </Button>
        </div>
      )}

      {isPlaceholderData && isFetching && !error && (
        <p role="status" className="text-xs text-gray-500">Refreshing your account details…</p>
      )}

      <Card className="border border-gray-800 bg-gray-900">
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <UserAvatar username={data.username} />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-white">{displayName}</h2>
                {data.tier && (
                  <Badge variant="outline" className="border-gray-700 bg-gray-800 text-gray-300 capitalize">
                    <Star className="mr-1 h-3 w-3 text-gray-400" aria-hidden="true" />
                    {data.tier} plan
                  </Badge>
                )}
                {personaLabel && (
                  <Badge variant="outline" className="border-gray-700 bg-gray-800 text-gray-300">
                    <Users className="mr-1 h-3 w-3 text-gray-400" aria-hidden="true" />
                    {personaLabel}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  @{data.username || 'Username unavailable'}
                </span>
                <span className="flex items-center gap-1.5 break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {data.email || 'Email unavailable'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {data.email_verified ? (
                  <Badge className="border-0 bg-green-400/20 text-green-400">
                    <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                    Email verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                    <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                    Email not verified
                  </Badge>
                )}
                {data.onboarded && (
                  <Badge className="border-0 bg-gray-700 text-gray-300">
                    <Award className="mr-1 h-3 w-3" aria-hidden="true" />
                    Setup complete
                  </Badge>
                )}
                <Badge variant="outline" className="border-gray-700 text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
                  Member since {memberSince}
                </Badge>
              </div>

              {data.nickname && <p className="text-sm text-gray-400">Nickname: {data.nickname}</p>}
              {data.bio && <p className="border-t border-gray-800 pt-3 text-sm leading-relaxed text-gray-400">{data.bio}</p>}

              {isDeletionPending && (
                <div role="status" className="rounded-lg border border-red-400/40 bg-red-400/10 p-3">
                  <div className="flex items-start gap-2 text-sm text-red-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Account deletion is scheduled for <strong>{deletionDate}</strong>. You can review or cancel it in Settings.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={BarChart3} label="Analyses" value={data.analyses_count ?? 'Not available'} />
        <StatCard
          icon={TrendingUp}
          label="Predictions"
          value={data.predictions_count ?? 'Not available'}
          subtitle={data.prediction_accuracy == null ? 'Accuracy not available' : String(data.prediction_accuracy) + '% accuracy'}
        />
        <StatCard icon={Newspaper} label="News read" value={data.news_read_count ?? 'Not available'} />
        <StatCard
          icon={Activity}
          label="Watchlist"
          value={Array.isArray(data.watchlist) ? data.watchlist.length : 'Not available'}
          subtitle={Array.isArray(data.watchlist) ? data.watchlist.length + ' tracked' : 'Not available'}
        />
      </div>

      <Card className="border border-gray-800 bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Activity className="h-4 w-4 text-gray-400" aria-hidden="true" />
              Watchlist
            </CardTitle>
            <CardDescription className="text-gray-400">Your saved stock symbols</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="min-h-[44px] gap-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Explore stocks
          </Button>
        </CardHeader>
        <CardContent>
          {watchlist.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {watchlist.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => navigate('/dashboard/' + encodeURIComponent(symbol))}
                    aria-label={'Open ' + symbol + ' analysis'}
                    className="min-h-[40px] rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Select a symbol to open its dashboard.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Your watchlist is empty. Explore the dashboard to find stocks to follow.
            </p>
          )}
        </CardContent>
      </Card>

      {(investmentGoal || riskTolerance || experienceLevel) && (
        <Card className="border border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Target className="h-4 w-4 text-gray-400" aria-hidden="true" />
              Investment profile
            </CardTitle>
            <CardDescription className="text-gray-400">
              The preferences used to shape your research workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {investmentGoal && <PreferenceBadge label="Goal" value={investmentGoal} icon={Target} />}
            {riskTolerance && <PreferenceBadge label="Risk tolerance" value={riskTolerance} icon={Shield} />}
            {experienceLevel && <PreferenceBadge label="Experience" value={experienceLevel} icon={Award} />}
            {personaLabel && <PreferenceBadge label="Persona" value={personaLabel} icon={Users} />}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/settings?tab=investment')}
              className="min-h-[40px] border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Edit investment profile
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <ActionButton icon={Edit} label="Edit profile" onClick={handleEditProfile} />
        <ActionButton icon={Lock} label="Change password" onClick={handleChangePassword} />
        <ActionButton icon={Key} label="Manage API keys" onClick={handleViewAPIKey} />
        <ActionButton
          icon={LogOut}
          label="Sign out"
          onClick={handleLogout}
          variant="ghost"
          loading={isLoggingOut}
        />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-white">Account security</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Keep your password and API keys private. Use Settings to update your account security and manage developer access.
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default React.memo(Profile);
