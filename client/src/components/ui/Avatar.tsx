import { VoiceFingerprint } from './VoiceFingerprint';
import { fingerprintFromPeaks } from '../../utils/generateFingerprint';
import type { User } from '../../types';

interface AvatarProps {
  user?: User | null;
  size?: number;
  animated?: boolean;
  isPlaying?: boolean;
  className?: string;
  anonymous?: boolean;
}

export function Avatar({
  user,
  size = 40,
  animated = false,
  isPlaying = false,
  className = '',
  anonymous = false,
}: AvatarProps) {
  if (anonymous || !user) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-echo-elevated ${className}`}
        style={{ width: size, height: size, flexShrink: 0 }}
      >
        <span style={{ fontSize: size * 0.45 }}>👻</span>
      </div>
    );
  }

  const fingerprint =
    user.voiceFingerprint && user.voiceFingerprint.length >= 4
      ? user.voiceFingerprint
      : fingerprintFromPeaks([]);

  const hasFingerprint = Boolean(user.voiceFingerprint && user.voiceFingerprint.length >= 4);

  if (hasFingerprint) {
    return (
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          background: user.avatarColor + '22',
          flexShrink: 0,
        }}
      >
        <VoiceFingerprint
          fingerprint={fingerprint}
          color={user.avatarColor || '#7C5CFF'}
          size={size}
          animated={animated}
          isPlaying={isPlaying}
        />
      </div>
    );
  }

  // Fallback: initials
  const initials = (user.displayName || user.username || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: user.avatarColor || '#7C5CFF',
        fontSize: size * 0.38,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
