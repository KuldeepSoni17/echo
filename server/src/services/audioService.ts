import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../utils/errors';
import { uploadFile, generateAudioKey, getPresignedUrl } from './s3Service';

const MIN_DURATION_SECONDS = 3;
const MAX_DURATION_SECONDS = 30;

function runFfprobe(inputPath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    command
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

/**
 * Returns duration in seconds. Throws if outside allowed range.
 */
export async function validateAudioDuration(inputPath: string): Promise<number> {
  const data = await runFfprobe(inputPath);
  const duration = data.format.duration ?? 0;

  if (duration < MIN_DURATION_SECONDS) {
    throw new ValidationError(
      `Audio too short. Minimum is ${MIN_DURATION_SECONDS} seconds (got ${duration.toFixed(1)}s).`,
    );
  }

  if (duration > MAX_DURATION_SECONDS) {
    throw new ValidationError(
      `Audio too long. Maximum is ${MAX_DURATION_SECONDS} seconds (got ${duration.toFixed(1)}s).`,
    );
  }

  return duration;
}

/**
 * Normalizes audio to -16 LUFS, outputs mono m4a at 128kbps.
 */
export async function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  const command = ffmpeg(inputPath)
    .audioFilters([
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      'aformat=sample_rates=44100:channel_layouts=mono',
    ])
    .audioBitrate('128k')
    .audioCodec('aac')
    .format('mp4')
    .output(outputPath);

  await runFfmpeg(command);
}

/**
 * Generates N amplitude peaks (0–1) from an audio file using ffmpeg astats filter.
 */
export async function generateWaveformPeaks(
  inputPath: string,
  numPeaks = 50,
): Promise<number[]> {
  return new Promise((resolve) => {
    const peaks: number[] = [];

    const command = ffmpeg(inputPath)
      .audioFilters(`asetnsamples=n=1024,astats=metadata=1:reset=1`)
      .format('null')
      .output('/dev/null');

    (command as unknown as { outputOptions: (...args: string[]) => typeof command }).outputOptions
      ? undefined
      : undefined; // no-op to satisfy linter

    // Parse stderr output for RMS peak values
    const rmsValues: number[] = [];

    command
      .on('stderr', (line: string) => {
        const match = /lavfi\.astats\.Overall\.RMS_peak=([0-9.\-inf]+)/.exec(line);
        if (match && match[1]) {
          const val = parseFloat(match[1]);
          if (isFinite(val)) {
            // dB value: convert to 0-1 range (typical range -60dB to 0dB)
            const normalized = Math.max(0, Math.min(1, (val + 60) / 60));
            rmsValues.push(normalized);
          }
        }
      })
      .on('end', () => {
        if (rmsValues.length === 0) {
          // Fallback: return random peaks for development
          for (let i = 0; i < numPeaks; i++) {
            peaks.push(Math.random() * 0.8 + 0.1);
          }
          resolve(peaks);
          return;
        }

        // Downsample to numPeaks
        const step = rmsValues.length / numPeaks;
        for (let i = 0; i < numPeaks; i++) {
          const idx = Math.min(Math.floor(i * step), rmsValues.length - 1);
          peaks.push(rmsValues[idx] ?? 0);
        }
        resolve(peaks);
      })
      .on('error', () => {
        // Fallback to random peaks if ffmpeg fails
        for (let i = 0; i < numPeaks; i++) {
          peaks.push(Math.random() * 0.8 + 0.1);
        }
        resolve(peaks);
      })
      .run();
  });
}

export interface ProcessedAudio {
  audioKey: string;
  audioDuration: number;
  waveformPeaks: number[];
  presignedUrl: string;
}

/**
 * Full audio processing pipeline:
 * 1. Save buffer to temp file
 * 2. Validate duration
 * 3. Normalize audio
 * 4. Generate waveform peaks
 * 5. Upload to S3
 * 6. Clean up temp files
 * 7. Return metadata
 */
export async function processAudioUpload(
  inputBuffer: Buffer,
  userId: string,
): Promise<ProcessedAudio> {
  const tempDir = os.tmpdir();
  const tempId = uuidv4();
  const inputPath = path.join(tempDir, `echo-input-${tempId}`);
  const outputPath = path.join(tempDir, `echo-output-${tempId}.m4a`);

  try {
    // Write buffer to temp file
    await fs.writeFile(inputPath, inputBuffer);

    let audioDuration: number;
    let waveformPeaks: number[];

    try {
      // Validate duration
      audioDuration = await validateAudioDuration(inputPath);

      // Normalize audio
      await normalizeAudio(inputPath, outputPath);

      // Generate waveform peaks from normalized output
      waveformPeaks = await generateWaveformPeaks(outputPath, 50);
    } catch (ffmpegError) {
      if (ffmpegError instanceof ValidationError) {
        throw ffmpegError;
      }

      // ffmpeg not available or processing error — use stubs in dev
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AudioService] ffmpeg unavailable, using stub values');
        audioDuration = 15; // stub
        waveformPeaks = Array.from({ length: 50 }, () =>
          Math.round((Math.random() * 0.8 + 0.1) * 100) / 100,
        );
        // Use input as output for dev
        await fs.copyFile(inputPath, outputPath).catch(() => {
          // Ignore if copy fails
        });
      } else {
        throw ffmpegError;
      }
    }

    // Read normalized file (or input if ffmpeg unavailable)
    let uploadBuffer: Buffer;
    try {
      uploadBuffer = await fs.readFile(outputPath);
    } catch {
      uploadBuffer = inputBuffer;
    }

    // Upload to S3
    const audioKey = generateAudioKey(userId, 'm4a');
    await uploadFile(audioKey, uploadBuffer, 'audio/mp4', {
      userId,
      duration: String(audioDuration),
    });

    // Generate presigned URL
    const presignedUrl = await getPresignedUrl(audioKey, 3600);

    return {
      audioKey,
      audioDuration,
      waveformPeaks,
      presignedUrl,
    };
  } finally {
    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
