import type { MoodTag } from '../../types';
import { getMoodConfig } from '../../utils/moodColors';

interface MoodBadgeProps {
  mood: MoodTag;
  size?: 'sm' | 'md';
  className?: string;
}

export function MoodBadge({ mood, size = 'md', className = '' }: MoodBadgeProps) {
  const config = getMoodConfig(mood);

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
