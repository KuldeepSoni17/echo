import { WaveformPlayer } from '../ui/WaveformPlayer';
import { Button } from '../ui/Button';
import { formatCountdown } from '../../utils/formatDuration';
import type { Challenge } from '../../types';

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: () => void;
}

export function ChallengeCard({ challenge, onJoin }: ChallengeCardProps) {
  const isEnded = new Date(challenge.endsAt) < new Date();
  const countdown = formatCountdown(challenge.endsAt);

  return (
    <div className="bg-echo-card rounded-2xl overflow-hidden border border-echo-elevated">
      {/* Header */}
      <div className="bg-accent-gradient px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
            {isEnded ? 'Ended Challenge' : '⚡ Active Challenge'}
          </p>
          <h3 className="text-white font-bold text-base mt-0.5">{challenge.title}</h3>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-xs">{challenge.entryCount} entries</p>
          <p className="text-white text-xs font-medium mt-0.5">{countdown}</p>
        </div>
      </div>

      {/* Prompt audio */}
      <div className="px-4 py-4">
        <p className="text-echo-secondary text-xs mb-3">Prompt</p>
        <WaveformPlayer
          audioUrl={challenge.promptAudioUrl}
          peaks={challenge.promptWaveformPeaks}
          color="#FF5C8A"
          compact
        />
      </div>

      {/* Top entries if ended */}
      {isEnded && challenge.topEntries && challenge.topEntries.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-echo-secondary text-xs mb-3">Top entries</p>
          <div className="space-y-2">
            {challenge.topEntries.slice(0, 3).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 bg-echo-elevated rounded-xl p-3">
                <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                <WaveformPlayer
                  audioUrl={entry.presignedAudioUrl ?? entry.audioUrl}
                  peaks={entry.waveformPeaks}
                  color="#7C5CFF"
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join button */}
      {!isEnded && (
        <div className="px-4 pb-4">
          <Button variant="primary" fullWidth onClick={onJoin}>
            Join Challenge
          </Button>
        </div>
      )}
    </div>
  );
}
