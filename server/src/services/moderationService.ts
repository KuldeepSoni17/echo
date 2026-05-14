export interface ModerationResult {
  flagged: boolean;
  confidence: number;
  categories: string[];
}

/**
 * Moderates audio content. Currently a stub — integrate with an AI audio moderation
 * service (e.g., AWS Rekognition, Google Video Intelligence, or a custom Whisper pipeline)
 * in production.
 */
export async function moderateAudio(s3Key: string): Promise<ModerationResult> {
  // TODO: Integrate AI audio moderation service
  if (process.env.NODE_ENV === 'development') {
    return { flagged: false, confidence: 0, categories: [] };
  }

  // Production stub — all content passes until real moderation is integrated
  void s3Key; // suppress unused warning
  return { flagged: false, confidence: 0, categories: [] };
}
