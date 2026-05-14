
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { MoodBadge } from '../ui/MoodBadge';
import { ProfileSkeleton } from '../ui/LoadingSkeleton';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../stores/authStore';
import { fingerprintFromPeaks } from '../../utils/generateFingerprint';
import { VoiceFingerprint } from '../ui/VoiceFingerprint';
import type { Post } from '../../types';

const STREAK_MILESTONES = [
  { days: 7, label: '7-day', emoji: '🔥' },
  { days: 30, label: '30-day', emoji: '🌟' },
  { days: 100, label: '100-day', emoji: '💎' },
  { days: 365, label: '365-day', emoji: '👑' },
];

export function ProfileScreen() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const effectiveUsername = username === 'me' ? currentUser?.username ?? '' : username ?? '';
  const isOwnProfile = !username || username === 'me' || username === currentUser?.username;

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['profile', effectiveUsername],
    queryFn: () => usersApi.getProfile(effectiveUsername),
    enabled: !!effectiveUsername,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', effectiveUsername],
    queryFn: () => usersApi.getUserPosts(effectiveUsername),
    enabled: !!effectiveUsername,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      user?.isFollowing
        ? usersApi.unfollowUser(user.id)
        : usersApi.followUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', effectiveUsername] });
    },
  });

  if (userLoading) return <ProfileSkeleton />;
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-echo-secondary">
        User not found
      </div>
    );
  }

  const fingerprint = user.voiceFingerprint ?? fingerprintFromPeaks([]);
  const earnedMilestones = STREAK_MILESTONES.filter((m) => user.streakCount >= m.days);
  const posts: Post[] = postsData?.items ?? [];

  return (
    <div className="flex flex-col min-h-full bg-echo-bg overflow-y-auto pb-24">
      {/* Header nav */}
      {!isOwnProfile && (
        <div className="flex items-center gap-3 px-4 py-4 pt-safe">
          <button onClick={() => navigate(-1)} className="text-echo-secondary p-1">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-echo-primary font-bold">@{user.username}</h1>
        </div>
      )}

      {/* Hero */}
      <div
        className="relative flex flex-col items-center pt-10 pb-6 px-4"
        style={{ background: `linear-gradient(180deg, ${user.avatarColor}22 0%, transparent 100%)` }}
      >
        {/* Large fingerprint avatar */}
        <div className="mb-4">
          {user.voiceFingerprint ? (
            <VoiceFingerprint
              fingerprint={fingerprint}
              color={user.avatarColor}
              size={96}
              animated
            />
          ) : (
            <Avatar user={user} size={96} animated />
          )}
        </div>

        <h2 className="text-echo-primary font-bold text-xl">{user.displayName}</h2>
        <p className="text-echo-secondary text-sm mt-0.5">@{user.username}</p>

        {/* Streak milestones */}
        {earnedMilestones.length > 0 && (
          <div className="flex gap-2 mt-3">
            {earnedMilestones.map((m) => (
              <span
                key={m.days}
                className="bg-echo-elevated rounded-full px-2.5 py-1 text-xs text-echo-secondary"
                title={`${m.label} streak`}
              >
                {m.emoji} {m.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-around bg-echo-card border-y border-echo-elevated py-4 px-4">
        <div className="flex flex-col items-center">
          <span className="text-echo-primary font-bold text-lg">{user.postCount ?? 0}</span>
          <span className="text-echo-secondary text-xs">Posts</span>
        </div>
        <div className="w-px h-8 bg-echo-elevated" />
        <div className="flex flex-col items-center">
          <span className="text-echo-primary font-bold text-lg">{user.followerCount ?? 0}</span>
          <span className="text-echo-secondary text-xs">Followers</span>
        </div>
        <div className="w-px h-8 bg-echo-elevated" />
        <div className="flex flex-col items-center">
          <span className="text-echo-primary font-bold text-lg">{user.followingCount ?? 0}</span>
          <span className="text-echo-secondary text-xs">Following</span>
        </div>
        <div className="w-px h-8 bg-echo-elevated" />
        <div className="flex flex-col items-center">
          <span className="text-echo-primary font-bold text-lg flex items-center gap-1">
            {user.streakCount}
            {user.streakCount > 0 && <span className="text-base">🔥</span>}
          </span>
          <span className="text-echo-secondary text-xs">Streak</span>
        </div>
      </div>

      {/* Action button */}
      <div className="px-4 py-4">
        {isOwnProfile ? (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/settings')}
          >
            Edit Profile
          </Button>
        ) : (
          <Button
            variant={user.isFollowing ? 'secondary' : 'primary'}
            fullWidth
            loading={followMutation.isPending}
            onClick={() => followMutation.mutate()}
          >
            {user.isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Posts grid */}
      <div className="px-4">
        <h3 className="text-echo-secondary text-xs font-semibold uppercase tracking-wider mb-3">
          Posts
        </h3>
        {postsLoading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-echo-elevated animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl">🎙️</span>
            <p className="text-echo-secondary text-sm mt-3">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.slice(0, 6).map((post) => (
              <button
                key={post.id}
                onClick={() => navigate(`/post/${post.id}`)}
                className="aspect-square bg-echo-card flex flex-col items-center justify-center gap-1 relative overflow-hidden"
              >
                {/* Mini waveform */}
                <div className="flex items-center gap-0.5 h-8 px-2">
                  {(post.waveformPeaks ?? []).slice(0, 12).map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${Math.max(2, v * 28)}px`,
                        background: user.avatarColor,
                      }}
                    />
                  ))}
                </div>
                <MoodBadge mood={post.moodTag} size="sm" />
                {post.isAnonymous && (
                  <span className="absolute top-1 right-1 text-xs">👻</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
