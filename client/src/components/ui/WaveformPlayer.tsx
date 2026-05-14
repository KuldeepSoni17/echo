import { useEffect } from 'react';
import { useWaveform } from '../../hooks/useWaveform';
import { formatDuration } from '../../utils/formatDuration';

interface WaveformPlayerProps {
  audioUrl: string;
  peaks?: number[];
  color?: string;
  duration?: number;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  compact?: boolean;
}

export function WaveformPlayer({
  audioUrl,
  peaks,
  color = '#7C5CFF',
  duration: propDuration,
  autoPlay = false,
  onPlay,
  onPause,
  onEnd,
  compact = false,
}: WaveformPlayerProps) {
  const { containerRef, isPlaying, currentTime, duration, play, pause, isReady } = useWaveform({
    audioUrl,
    peaks,
    color,
    onFinish: onEnd,
  });

  useEffect(() => {
    if (autoPlay && isReady) {
      play();
    }
  }, [autoPlay, isReady, play]);

  const handleToggle = () => {
    if (isPlaying) {
      pause();
      onPause?.();
    } else {
      play();
      onPlay?.();
    }
  };

  const displayDuration = duration > 0 ? duration : (propDuration ?? 0);

  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'w-full'}`}>
      {/* Play/Pause button */}
      <button
        onClick={handleToggle}
        disabled={!isReady}
        className={`flex-shrink-0 flex items-center justify-center rounded-full bg-echo-accent
          hover:bg-purple-500 active:scale-95 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${compact ? 'w-9 h-9' : 'w-11 h-11'}`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="white" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="white" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0">
        <div
          ref={containerRef}
          className={`w-full ${compact ? 'h-8' : 'h-12'} ${!isReady ? 'opacity-40' : ''}`}
        />
        <div className="flex justify-between text-xs text-echo-muted mt-0.5">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
}
