import { useCallback, useRef } from 'react';
import { formatDuration } from '../../utils/formatDuration';

interface RecordButtonProps {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

export function RecordButton({
  isRecording,
  duration,
  onStart,
  onStop,
  disabled = false,
  size = 'lg',
}: RecordButtonProps) {
  const isHoldingRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (disabled || isRecording) return;
    isHoldingRef.current = true;
    onStart();
  }, [disabled, isRecording, onStart]);

  const handlePointerUp = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    if (isRecording) {
      onStop();
    }
  }, [isRecording, onStop]);

  const btnSize = size === 'lg' ? 96 : 72;
  const btnClass = size === 'lg' ? 'w-24 h-24' : 'w-18 h-18';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing rings when recording */}
      {isRecording && (
        <>
          <span
            className="absolute rounded-full bg-echo-accent/30 animate-pulse-ring"
            style={{ width: btnSize + 32, height: btnSize + 32 }}
          />
          <span
            className="absolute rounded-full bg-echo-accent/20 animate-pulse-ring"
            style={{
              width: btnSize + 56,
              height: btnSize + 56,
              animationDelay: '0.5s',
            }}
          />
        </>
      )}

      {/* Main button */}
      <button
        className={`relative ${btnClass} rounded-full flex flex-col items-center justify-center
          select-none touch-none cursor-pointer transition-all duration-200
          ${isRecording
            ? 'bg-echo-danger scale-105 shadow-lg shadow-red-500/40'
            : 'bg-echo-accent hover:bg-purple-500 active:scale-95 shadow-lg shadow-purple-500/40'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ width: btnSize, height: btnSize }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Hold to record'}
      >
        {isRecording ? (
          <>
            <div className="w-5 h-5 rounded-sm bg-white" />
            <span className="text-white text-xs font-semibold mt-1 tabular-nums">
              {formatDuration(duration)}
            </span>
          </>
        ) : (
          <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0 5 5 0 0010 0z" />
            <path d="M12 18v3M9 21h6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </button>

      {!isRecording && (
        <p className="absolute -bottom-7 text-echo-muted text-xs whitespace-nowrap">
          Hold to record
        </p>
      )}
    </div>
  );
}
