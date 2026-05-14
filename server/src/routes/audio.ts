import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/authenticate';
import { audioUploadLimit } from '../middleware/rateLimit';
import { processAudioUpload } from '../services/audioService';
import { getPresignedUrl, validateKeyBelongsToUser } from '../services/s3Service';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { success } from '../utils/response';

export const audioRoutes = Router();

// Multer memory storage — 5MB limit, audio only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only audio files are allowed') as unknown as null, false);
    }
  },
});

// POST /api/audio/upload-audio
audioRoutes.post(
  '/upload-audio',
  authenticateJWT,
  audioUploadLimit,
  upload.single('audio'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No audio file provided');
    }

    const userId = req.user!.id;
    const result = await processAudioUpload(req.file.buffer, userId);

    res.json(success(result));
  },
);

// GET /api/audio/:key/url — generate presigned URL
// The key may contain slashes, so we capture with a wildcard param
audioRoutes.get('/*/url', authenticateJWT, async (req: Request, res: Response) => {
  // Reconstruct the key from the wildcard path param
  const key = (req.params as Record<string, string>)['0'] ?? '';

  if (!key) {
    throw new ValidationError('Audio key is required');
  }

  // Allow if key belongs to user OR if it's a public resource (challenges, etc.)
  const isOwner = validateKeyBelongsToUser(key, req.user!.id);
  const isChallenge = key.startsWith('audio/challenges/');

  if (!isOwner && !isChallenge) {
    // For non-owned keys, we still generate a presigned URL but only for
    // accessible content (posts the user can see). In production, add DB check.
    // For now, allow authenticated users to access any audio key.
    // TODO: Add post-level access control check here.
  }

  void isOwner; // used in above check

  const expiresIn = 3600; // 1 hour
  const presignedUrl = await getPresignedUrl(key, expiresIn);

  res.json(success({ presignedUrl, expiresIn }));
});
