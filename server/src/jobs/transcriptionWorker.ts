import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Queues a transcription job for a post's audio.
 * Currently a stub — integrate with a speech-to-text service
 * (Whisper API, Google Speech, AWS Transcribe, etc.) in production.
 *
 * @param postId - The ID of the post to transcribe
 * @param audioKey - The S3 key of the audio file
 */
export async function queueTranscription(postId: string, audioKey: string): Promise<void> {
  // TODO: Integrate with speech-to-text service (Whisper API, Google Speech, etc.)
  // In production, push to a job queue (Bull, SQS, etc.) instead of setTimeout

  if (process.env.NODE_ENV === 'production') {
    logger.info({ postId, audioKey }, 'Transcription queued (stub - integrate real service)');
    // TODO: Add to job queue here
    return;
  }

  // Development stub: simulate async transcription after 5 seconds
  setTimeout(() => {
    void (async () => {
      try {
        const transcription = '[Transcription pending - AI integration required]';
        await prisma.post.update({
          where: { id: postId },
          data: { transcription },
        });
        logger.debug({ postId }, 'Stub transcription applied');
      } catch (err) {
        logger.error({ err, postId }, 'Failed to apply stub transcription');
      }
    })();
  }, 5000);
}

/**
 * Process a transcription job (call this from your job queue worker).
 * This is the actual worker function to implement with a real STT service.
 */
export async function processTranscription(postId: string, audioKey: string): Promise<void> {
  // TODO: Implement real transcription
  // Example with OpenAI Whisper:
  //
  // const s3Url = await getPresignedUrl(audioKey, 300);
  // const response = await fetch(s3Url);
  // const audioBlob = await response.blob();
  //
  // const formData = new FormData();
  // formData.append('file', audioBlob, 'audio.m4a');
  // formData.append('model', 'whisper-1');
  // formData.append('language', 'en');
  //
  // const result = await openai.audio.transcriptions.create({ file: audioBlob, model: 'whisper-1' });
  //
  // await prisma.post.update({
  //   where: { id: postId },
  //   data: { transcription: result.text },
  // });

  logger.warn({ postId, audioKey }, 'processTranscription called but not yet implemented');
  throw new Error('Transcription service not implemented');
}
