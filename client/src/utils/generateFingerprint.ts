/**
 * Generates a voice fingerprint from an AnalyserNode.
 * Captures 32 frequency band averages, normalized 0-1.
 */
export function generateFingerprint(analyser: AnalyserNode): number[] {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const numBands = 32;
  const bandSize = Math.floor(bufferLength / numBands);
  const fingerprint: number[] = [];

  for (let i = 0; i < numBands; i++) {
    let sum = 0;
    for (let j = 0; j < bandSize; j++) {
      sum += dataArray[i * bandSize + j];
    }
    fingerprint.push(sum / bandSize);
  }

  // Normalize to 0-1
  const max = Math.max(...fingerprint, 1);
  return fingerprint.map((v) => v / max);
}

/**
 * Captures a single fingerprint snapshot from an AnalyserNode.
 * For static fingerprints (post-recording).
 */
export function captureFingerprint(analyser: AnalyserNode): number[] {
  return generateFingerprint(analyser);
}

/**
 * Generate a random fingerprint for placeholder/demo purposes.
 */
export function randomFingerprint(): number[] {
  return Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.1);
}

/**
 * Generate a fingerprint from waveform peaks by sampling.
 */
export function fingerprintFromPeaks(peaks: number[]): number[] {
  if (peaks.length === 0) return randomFingerprint();

  const numBands = 32;
  const result: number[] = [];
  const step = peaks.length / numBands;

  for (let i = 0; i < numBands; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(Math.floor((i + 1) * step), peaks.length);
    const slice = peaks.slice(start, end);
    const avg = slice.length > 0
      ? slice.reduce((a, b) => a + b, 0) / slice.length
      : 0;
    result.push(avg);
  }

  return result;
}
