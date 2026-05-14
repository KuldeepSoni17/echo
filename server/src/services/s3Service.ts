import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { ForbiddenError } from '../utils/errors';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(metadata ? { Metadata: metadata } : {}),
    }),
  );
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

/**
 * Generates a structured S3 key for audio files.
 * Format: audio/{userId}/{year}/{month}/{uuid}.{ext}
 */
export function generateAudioKey(userId: string, ext: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = uuidv4();
  return `audio/${userId}/${year}/${month}/${id}.${ext}`;
}

/**
 * Validates that the given S3 key belongs to the specified user.
 * Keys are structured as: audio/{userId}/...
 */
export function validateKeyBelongsToUser(key: string, userId: string): boolean {
  const parts = key.split('/');
  // Expected: ['audio', userId, year, month, filename]
  if (parts.length < 2) return false;
  if (parts[0] !== 'audio') return false;
  if (parts[1] !== userId) return false;
  return true;
}

export function assertKeyBelongsToUser(key: string, userId: string): void {
  if (!validateKeyBelongsToUser(key, userId)) {
    throw new ForbiddenError('You do not have access to this audio file');
  }
}
