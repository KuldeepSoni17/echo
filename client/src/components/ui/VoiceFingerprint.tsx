import { useMemo } from 'react';

interface VoiceFingerprintProps {
  fingerprint: number[]; // 32 values 0-1
  color: string;         // hex color
  size?: number;
  animated?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export function VoiceFingerprint({
  fingerprint,
  color,
  size = 48,
  animated = false,
  isPlaying = false,
  className = '',
}: VoiceFingerprintProps) {
  const points = useMemo(() => {
    const fp = fingerprint.length >= 4 ? fingerprint : Array(32).fill(0.5);
    return fp;
  }, [fingerprint]);

  const path = useMemo(() => {
    const fp = points.length >= 4 ? points : Array(32).fill(0.5);
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.28;
    const amplitude = size * 0.18;

    // Build closed SVG path using cubic bezier via catmull-rom spline
    const n = fp.length;
    const coords: [number, number][] = fp.map((v, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = baseRadius + v * amplitude;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });

    // Catmull-Rom → Cubic Bezier conversion
    const getControl = (
      p0: [number, number],
      p1: [number, number],
      p2: [number, number],
      t = 0.5,
    ): [[number, number], [number, number]] => {
      const cp1: [number, number] = [
        p1[0] + (p2[0] - p0[0]) * t * 0.33,
        p1[1] + (p2[1] - p0[1]) * t * 0.33,
      ];
      const cp2: [number, number] = [
        p2[0] - (p2[0] - p0[0]) * t * 0.33,
        p2[1] - (p2[1] - p0[1]) * t * 0.33,
      ];
      return [cp1, cp2];
    };

    let d = `M ${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)}`;
    for (let i = 0; i < n; i++) {
      const p0 = coords[(i - 1 + n) % n];
      const p1 = coords[i];
      const p2 = coords[(i + 1) % n];
      const p3 = coords[(i + 2) % n];
      void p0;
      void p3;
      const [cp1, cp2] = getControl(p0, p1, p2);
      const next = coords[(i + 1) % n];
      d += ` C ${cp1[0].toFixed(2)} ${cp1[1].toFixed(2)}, ${cp2[0].toFixed(2)} ${cp2[1].toFixed(2)}, ${next[0].toFixed(2)} ${next[1].toFixed(2)}`;
    }
    d += ' Z';
    return d;
  }, [points, size]);

  const animClass = isPlaying
    ? 'animate-fingerprint-active'
    : animated
    ? 'animate-fingerprint-breathe'
    : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={[animClass, className].filter(Boolean).join(' ')}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`fp-grad-${color.replace('#', '')}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <path
        d={path}
        fill={color}
        opacity="0.15"
        style={{ filter: 'blur(4px)' }}
      />
      {/* Main shape */}
      <path
        d={path}
        fill={`url(#fp-grad-${color.replace('#', '')})`}
        stroke={color}
        strokeWidth={size * 0.02}
        strokeOpacity="0.6"
      />
    </svg>
  );
}
