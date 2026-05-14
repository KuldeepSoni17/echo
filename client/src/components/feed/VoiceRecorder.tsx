import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RecordButton } from '../ui/RecordButton';
import { WaveformPlayer } from '../ui/WaveformPlayer';
import { MoodBadge } from '../ui/MoodBadge';
import { Button } from '../ui/Button';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { audioApi } from '../../api/audio';
import { postsApi } from '../../api/posts';
import { generateFingerprint } from '../../utils/generateFingerprint';
import { formatDuration } from '../../utils/formatDuration';
import type { MoodTag } from '../../types';

interface VoiceRecorderProps {
  mode: 'post' | 'comment' | 'echo';
  postId?: string;
  originalWaveformPeaks?: number[];
  onSuccess?: (postId: string) => void;
  onClose: () => void;
}

const MOODS: MoodTag[] = ['CALM', 'EXCITED', 'FUNNY', 'VULNERABLE', 'SERIOUS', 'CURIOUS'];
const MAX_DURATION = 30;
const WARN_DURATION = 25;

export function VoiceRecorder({
  mode,
  postId,
  originalWaveformPeaks,
  onSuccess,
  onClose,
}: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    discardRecording,
    analyserNode,
    error: recorderError,
  } = useAudioRecorder();

  const [selectedMood, setSelectedMood] = useState<MoodTag>('CALM');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Real-time waveform animation
  useEffect(() => {
    if (!isRecording || !analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#7C5CFF';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, analyserNode]);

  // Generate peaks when recording stops
  useEffect(() => {
    if (!audioBlob) return;
    audioApi.generateWaveformPeaks(audioBlob).then(setWaveformPeaks).catch(() => {});
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  // Capture fingerprint during recording
  useEffect(() => {
    if (!isRecording || !analyserNode) return;
    const fp = generateFingerprint(analyserNode);
    void fp; // stored if needed
  }, [isRecording, analyserNode]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error('No audio recorded');
      const uploadRes = await audioApi.uploadAudio(audioBlob, setUploadProgress);
      const { audioUrl: uploadedUrl, waveformPeaks: serverPeaks, duration: audioDuration } = uploadRes;
      const peaks = serverPeaks ?? waveformPeaks;

      if (mode === 'post') {
        const post = await postsApi.createPost({
          audioUrl: uploadedUrl,
          waveformPeaks: peaks,
          audioDuration,
          moodTag: selectedMood,
          isAnonymous,
        });
        return post.id;
      } else if (mode === 'comment' && postId) {
        const comment = await postsApi.createComment(postId, {
          audioUrl: uploadedUrl,
          waveformPeaks: peaks,
          audioDuration,
          isAnonymous,
        });
        return comment.id;
      } else if (mode === 'echo' && postId) {
        const echo = await postsApi.createEcho(postId, {
          audioUrl: uploadedUrl,
          waveformPeaks: peaks,
          audioDuration,
          isAnonymous,
          moodTag: selectedMood,
        });
        return echo.id;
      }
      throw new Error('Invalid mode');
    },
    onSuccess: (id) => {
      if (id) onSuccess?.(id);
      onClose();
    },
  });

  const handleDiscard = () => {
    discardRecording();
    setAudioUrl(null);
    setWaveformPeaks([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-echo-bg/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-safe">
        <button onClick={onClose} className="text-echo-secondary hover:text-echo-primary p-2">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="text-echo-primary font-semibold text-base capitalize">
          {mode === 'post' ? 'New Voice Post' : mode === 'comment' ? 'Voice Reply' : 'Echo'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Echo mode: show original waveform */}
        {mode === 'echo' && originalWaveformPeaks && (
          <div className="w-full opacity-40">
            <p className="text-echo-muted text-xs mb-2 text-center">Original</p>
            <div className="flex items-center gap-1 h-8 justify-center">
              {originalWaveformPeaks.slice(0, 40).map((v, i) => (
                <div
                  key={i}
                  className="bg-echo-secondary rounded-full w-1"
                  style={{ height: `${Math.max(4, v * 32)}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Waveform canvas while recording */}
        {isRecording && (
          <div className="w-full">
            <canvas ref={canvasRef} className="w-full h-24 rounded-xl" width={400} height={96} />
            <p className={`text-center text-sm mt-2 font-mono tabular-nums ${duration >= WARN_DURATION ? 'text-echo-danger' : 'text-echo-secondary'}`}>
              {formatDuration(duration)} / {formatDuration(MAX_DURATION)}
            </p>
          </div>
        )}

        {/* Playback after recording */}
        {audioBlob && audioUrl && !isRecording && (
          <div className="w-full">
            <WaveformPlayer
              audioUrl={audioUrl}
              peaks={waveformPeaks}
              color="#7C5CFF"
              duration={duration}
            />
          </div>
        )}

        {/* Empty state */}
        {!isRecording && !audioBlob && (
          <div className="text-center">
            <p className="text-echo-secondary text-sm">Hold the button below to record</p>
            <p className="text-echo-muted text-xs mt-1">Up to 30 seconds</p>
          </div>
        )}

        {/* Record button */}
        {!audioBlob && (
          <RecordButton
            isRecording={isRecording}
            duration={duration}
            onStart={startRecording}
            onStop={stopRecording}
          />
        )}

        {recorderError && (
          <p className="text-echo-danger text-sm text-center">{recorderError}</p>
        )}

        {/* After recording: mood + anonymous + submit */}
        {audioBlob && !isRecording && (
          <div className="w-full space-y-5">
            {/* Mood selector (post + echo only) */}
            {(mode === 'post' || mode === 'echo') && (
              <div>
                <p className="text-echo-secondary text-sm mb-3">Mood</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMood(m)}
                      className={`transition-transform ${selectedMood === m ? 'scale-105' : 'opacity-60'}`}
                    >
                      <MoodBadge mood={m} size="md" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Anonymous toggle (post + comment) */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-echo-primary text-sm font-medium">Post anonymously 👻</p>
                <p className="text-echo-muted text-xs">Your identity will be hidden</p>
              </div>
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`w-12 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-echo-accent' : 'bg-echo-elevated'}`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {uploadMutation.isError && (
              <p className="text-echo-danger text-sm text-center">
                Upload failed. Please try again.
              </p>
            )}

            {uploadMutation.isPending && uploadProgress > 0 && (
              <div>
                <div className="w-full h-1 bg-echo-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-echo-accent transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-echo-muted text-xs text-center mt-1">{uploadProgress}%</p>
              </div>
            )}

            <div className="flex gap-3 pb-6">
              <Button variant="secondary" fullWidth onClick={handleDiscard} disabled={uploadMutation.isPending}>
                Discard
              </Button>
              <Button
                variant="primary"
                fullWidth
                loading={uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {mode === 'post' ? 'Post' : mode === 'comment' ? 'Reply' : 'Echo'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
