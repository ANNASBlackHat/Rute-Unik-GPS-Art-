'use client';

import { Output, BufferTarget, Mp4OutputFormat, CanvasSource } from 'mediabunny';
import { drawFrame, type VideoRenderParams } from '@/lib/video-renderer';

export interface VideoExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  durationSeconds?: number;
  bitrate?: number;
  codec?: 'avc' | 'vp9' | 'av1' | 'hevc';
}

export interface VideoExportProgress {
  framesEncoded: number;
  totalFrames: number;
  percent: number;
}

const DEFAULTS = {
  width: 1080,
  height: 1080,
  fps: 30,
  durationSeconds: 8,
  bitrate: 2_500_000,
  codec: 'avc' as const,
};

/**
 * Client-side video export (spec §3).
 * Stepped progress 0→1, not realtime, via offscreen canvas + Mediabunny + WebCodecs.
 * Returns a Blob (video/mp4) ready for download.
 */
export async function exportRouteVideo(
  coords: [number, number][],
  params: Omit<VideoRenderParams, 'progress'>,
  options: VideoExportOptions = {},
  onProgress?: (p: VideoExportProgress) => void,
): Promise<Blob> {
  const width = options.width ?? DEFAULTS.width;
  const height = options.height ?? DEFAULTS.height;
  const fps = options.fps ?? DEFAULTS.fps;
  const durationSeconds = options.durationSeconds ?? DEFAULTS.durationSeconds;
  const bitrate = options.bitrate ?? DEFAULTS.bitrate;
  const codec = (options.codec ?? DEFAULTS.codec) as 'avc' | 'vp9' | 'av1' | 'hevc';

  if (coords.length < 2) throw new Error('Need at least 2 coordinates to render video');

  const totalFrames = Math.max(1, Math.round(durationSeconds * fps));

  // Create offscreen canvas (fallback to DOM canvas)
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          return c;
        })();

  // ctx for drawing — OffscreenCanvas getContext may return OffscreenCanvasRenderingContext2D
  const ctx = (canvas as HTMLCanvasElement).getContext('2d') as unknown as CanvasRenderingContext2D;
  if (!ctx) throw new Error('Could not get 2D context for video canvas');

  // Mediabunny Output → BufferTarget (in-memory MP4)
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  // CanvasSource handles VideoEncoder internally; we just call add() per frame
  const canvasSource = new CanvasSource(canvas as HTMLCanvasElement, {
    codec,
    bitrate,
  });

  const track = output.addVideoTrack(canvasSource, {
    frameRate: fps,
  } as unknown as Record<string, unknown>);

  // Some mediabunny versions require explicit track metadata; ensure video track is configured
  void track;

  await output.start();

  for (let i = 0; i < totalFrames; i++) {
    const progress = totalFrames === 1 ? 1 : i / (totalFrames - 1);
    // Draw single frame
    drawFrame(ctx, coords, { ...params, progress }, { width, height });

    const timestamp = i / fps;
    const duration = 1 / fps;
    // CanvasSource.add captures current canvas content at timestamp
    await canvasSource.add(timestamp, duration);

    if (onProgress) {
      onProgress({
        framesEncoded: i + 1,
        totalFrames,
        percent: Math.round(((i + 1) / totalFrames) * 100),
      });
    }
  }

  // Flush encoder and finalize file
  await output.finalize();

  // BufferTarget exposes buffer — mediabunny BufferTarget has `buffer` property (Uint8Array)
  const maybeBuffer = target as unknown as { buffer?: Uint8Array; view?: Uint8Array };
  const buf = maybeBuffer.buffer ?? maybeBuffer.view;
  if (!buf) {
    // Fallback: some versions expose via target.buffer after finalize as blob
    throw new Error('Mp4 output buffer not available after finalize');
  }
  // Copy to Blob with correct MIME
  return new Blob([buf as unknown as BlobPart], { type: 'video/mp4' });
}

/**
 * Preview loop variant (spec §3 Preview loop variant).
 * Short, muted, lower-res MP4 that the UI presents as GIF.
 */
export async function exportRoutePreviewLoop(
  coords: [number, number][],
  params: Omit<VideoRenderParams, 'progress'>,
  onProgress?: (p: VideoExportProgress) => void,
): Promise<Blob> {
  return exportRouteVideo(
    coords,
    params,
    { width: 720, height: 720, fps: 24, durationSeconds: 2.5, bitrate: 1_000_000 },
    onProgress,
  );
}
