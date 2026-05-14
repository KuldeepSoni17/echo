import api from './client';
import type { AudioUploadResponse, PresignedUrlResponse } from '../types';

export const audioApi = {
  // Upload audio directly (multipart/form-data)
  uploadAudio: (blob: Blob, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    return api.post<AudioUploadResponse>('/audio/upload-audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    }).then((r) => r.data);
  },

  // Get a presigned S3 URL for direct upload
  getPresignedUrl: (contentType: string = 'audio/webm') =>
    api.post<PresignedUrlResponse>('/audio/presigned-url', { contentType }),

  // Upload directly to S3 using presigned URL
  uploadToPresignedUrl: async (
    uploadUrl: string,
    blob: Blob,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', blob.type || 'audio/webm');

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.send(blob);
    });
  },

  // Generate waveform peaks from an audio blob (client-side)
  generateWaveformPeaks: async (blob: Blob, numPeaks = 100): Promise<number[]> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numPeaks);
    const peaks: number[] = [];

    for (let i = 0; i < numPeaks; i++) {
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(channelData[i * blockSize + j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    // Normalize
    const maxPeak = Math.max(...peaks, 0.001);
    return peaks.map((p) => p / maxPeak);
  },
};
