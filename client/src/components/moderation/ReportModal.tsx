import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import api from '../../api/client';
import type { ReportReason } from '../../types';

interface ReportModalProps {
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'HATE_SPEECH', label: 'Hate speech', icon: '🚫' },
  { value: 'HARASSMENT', label: 'Harassment or bullying', icon: '😤' },
  { value: 'SPAM', label: 'Spam', icon: '📢' },
  { value: 'MISINFORMATION', label: 'False information', icon: '❌' },
  { value: 'EXPLICIT_CONTENT', label: 'Explicit or adult content', icon: '🔞' },
  { value: 'VIOLENCE', label: 'Violence or threats', icon: '⚠️' },
  { value: 'OTHER', label: 'Something else', icon: '💬' },
];

export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/reports', {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      }),
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}>
        <div className="bg-echo-card rounded-t-3xl w-full max-w-mobile p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-echo-primary font-semibold text-lg mb-2">Report submitted</h2>
          <p className="text-echo-secondary text-sm mb-6">
            Thanks for keeping Echo safe. We'll review this shortly.
          </p>
          <Button variant="secondary" fullWidth onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-echo-card rounded-t-3xl w-full max-w-mobile max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-echo-elevated rounded-full mx-auto mb-6" />

          <h2 className="text-echo-primary font-semibold text-lg mb-1">Report</h2>
          <p className="text-echo-secondary text-sm mb-5">Why are you reporting this?</p>

          <div className="space-y-2 mb-5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors
                  ${reason === r.value
                    ? 'border-echo-accent bg-echo-accent/10 text-echo-primary'
                    : 'border-echo-elevated text-echo-secondary hover:border-echo-muted'
                  }`}
              >
                <span className="text-lg">{r.icon}</span>
                <span className="text-sm font-medium">{r.label}</span>
              </button>
            ))}
          </div>

          {reason && (
            <div className="mb-5">
              <label className="block text-echo-secondary text-sm mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Tell us more..."
                rows={3}
                className="w-full bg-echo-elevated border border-echo-muted/30 text-echo-primary
                  placeholder:text-echo-muted rounded-xl px-4 py-3 text-sm focus:outline-none
                  focus:border-echo-accent resize-none"
              />
              <p className="text-echo-muted text-xs text-right mt-1">{description.length}/500</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
            <Button
              variant="danger"
              fullWidth
              disabled={!reason}
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
