import { useEffect, useState } from 'react';
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
}

/* ─── Static bar renderer (used when no real audio) ─────────── */
function StaticBars({ peaks, color, progress }: { peaks: number[]; color: string; progress: number }) {
  const bars = peaks.length > 0 ? peaks : Array.from({ length: 60 }, (_, i) =>
    Math.abs(Math.sin(i * 0.4) * 0.5 + Math.sin(i * 0.15) * 0.3 + 0.15)
  );
  const filled = Math.round(progress * bars.length);

  return (
    <div className="flex items-center gap-[2px] h-10 w-full">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(15, Math.min(100, v * 100))}%`,
            background: i < filled ? color : 'rgba(255,255,255,0.1)',
            opacity: i < filled ? 1 : 0.6,
          }}
        />
      ))}
    </div>
  );
}

export function WaveformPlayer({
  audioUrl,
  peaks = [],
  color = '#7C5CFF',
  duration: propDuration,
  autoPlay = false,
  onPlay,
  onPause,
  onEnd,
}: WaveformPlayerProps) {
  const hasRealAudio = audioUrl.startsWith('http') || audioUrl.startsWith('blob');
  const { containerRef, isPlaying, currentTime, duration, play, pause, isReady } = useWaveform({
    audioUrl: hasRealAudio ? audioUrl : '',
    peaks,
    color,
    onFinish: onEnd,
  });

  // Demo-mode playback simulation
  const [demoTime, setDemoTime] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const totalDuration = duration > 0 ? duration : (propDuration ?? 0);

  useEffect(() => {
    if (!hasRealAudio && demoPlaying) {
      const interval = setInterval(() => {
        setDemoTime(t => {
          if (t >= totalDuration) { setDemoPlaying(false); onEnd?.(); return 0; }
          return t + 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasRealAudio, demoPlaying, totalDuration, onEnd]);

  useEffect(() => {
    if (autoPlay && isReady && hasRealAudio) play();
  }, [autoPlay, isReady, play, hasRealAudio]);

  const isCurrentlyPlaying = hasRealAudio ? isPlaying : demoPlaying;
  const currentDisplayTime = hasRealAudio ? currentTime : demoTime;
  const progress = totalDuration > 0 ? currentDisplayTime / totalDuration : 0;

  const handleToggle = () => {
    if (hasRealAudio) {
      if (isPlaying) { pause(); onPause?.(); } else { play(); onPlay?.(); }
    } else {
      if (demoPlaying) { setDemoPlaying(false); onPause?.(); }
      else { setDemoPlaying(true); onPlay?.(); }
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">

      {/* Play / Pause button */}
      <button
        onClick={handleToggle}
        disabled={hasRealAudio && !isReady}
        className="relative flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-90 disabled:opacity-40"
        style={{
          background: `linear-gradient(135deg, ${color}ee, ${color}99)`,
          boxShadow: isCurrentlyPlaying ? `0 0 18px ${color}55` : 'none',
        }}
        aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
      >
        {isCurrentlyPlaying ? (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
            <rect x="5" y="3" width="5" height="18" rx="1.5" />
            <rect x="14" y="3" width="5" height="18" rx="1.5" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
            <polygon points="5,3 20,12 5,21" />
          </svg>
        )}

        {/* Pulse ring when playing */}
        {isCurrentlyPlaying && (
          <span className="absolute inset-0 rounded-full animate-pulse-ring"
            style={{ background: color, opacity: 0.25 }} />
        )}
      </button>

      {/* Waveform + times */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {hasRealAudio ? (
          <div ref={containerRef} className="wavesurfer-wrapper h-10 w-full" />
        ) : (
          <StaticBars peaks={peaks} color={color} progress={progress} />
        )}

        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono text-echo-muted tabular-nums">
            {formatDuration(currentDisplayTime)}
          </span>
          <span className="text-[11px] font-mono text-echo-muted tabular-nums">
            {formatDuration(totalDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
