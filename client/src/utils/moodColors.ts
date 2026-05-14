import type { MoodTag } from '../types';

export interface MoodConfig {
  label: string;
  color: string;       // hex
  bg: string;          // tailwind bg class
  text: string;        // tailwind text class
  border: string;      // tailwind border class
  emoji: string;
}

export const MOOD_CONFIG: Record<MoodTag, MoodConfig> = {
  CALM: {
    label: 'Calm',
    color: '#5C9EFF',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    emoji: '🌊',
  },
  EXCITED: {
    label: 'Excited',
    color: '#FFB800',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    emoji: '⚡',
  },
  FUNNY: {
    label: 'Funny',
    color: '#FF8C00',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    emoji: '😄',
  },
  VULNERABLE: {
    label: 'Vulnerable',
    color: '#FF5C8A',
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/40',
    emoji: '💙',
  },
  SERIOUS: {
    label: 'Serious',
    color: '#8888AA',
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/40',
    emoji: '🎯',
  },
  CURIOUS: {
    label: 'Curious',
    color: '#00E5FF',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    emoji: '🔍',
  },
};

export function getMoodConfig(mood: MoodTag): MoodConfig {
  return MOOD_CONFIG[mood];
}
