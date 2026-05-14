import { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

export interface UseWaveformOptions {
  audioUrl?: string;
  peaks?: number[];
  color?: string;
  onReady?: () => void;
  onFinish?: () => void;
}

export interface UseWaveformReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  seekTo: (progress: number) => void;
  isReady: boolean;
}

export function useWaveform({
  audioUrl,
  peaks,
  color = '#7C5CFF',
  onReady,
  onFinish,
}: UseWaveformOptions): UseWaveformReturn {
  const containerRef = useRef<HTMLDivElement>(null!);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor: '#FFFFFF',
      cursorColor: 'transparent',
      barWidth: 2,
      barRadius: 2,
      barGap: 1,
      height: 48,
      normalize: true,
      interact: true,
      peaks: peaks ? ([peaks] as (number[] | Float32Array)[]) : undefined,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsReady(true);
      onReady?.();
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onFinish?.();
    });

    ws.load(audioUrl, peaks ? [peaks] : undefined);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const play = useCallback(() => {
    wavesurferRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    wavesurferRef.current?.pause();
  }, []);

  const seekTo = useCallback((progress: number) => {
    wavesurferRef.current?.seekTo(Math.max(0, Math.min(1, progress)));
  }, []);

  return { containerRef, isPlaying, currentTime, duration, play, pause, seekTo, isReady };
}
