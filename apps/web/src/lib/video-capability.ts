/**
 * Capability check before offering client-side export (spec §3.1).
 * WebCodecs VideoEncoder must support the target codec/config.
 */

export type VideoCodec = 'avc' | 'vp9' | 'av1';

export const DEFAULT_VIDEO_CONFIG = {
  codec: 'avc1.42001f' as const, // H.264 Baseline 3.1 — widest hardware support
  width: 1080,
  height: 1080,
  bitrate: 2_500_000,
  framerate: 30,
} as const;

// Fallback configs to try if default fails (e.g. headless Chrome, Safari)
// We try smaller resolution and alternate codec before giving up to server fallback
const FALLBACK_CONFIGS: Array<{ codec: string; width: number; height: number }> = [
  { codec: 'avc1.42001f', width: 720, height: 720 },
  { codec: 'avc1.42001e', width: 1080, height: 1080 },
  { codec: 'avc1.42001e', width: 720, height: 720 },
  { codec: 'vp09.00.10.08', width: 1080, height: 1080 },
];

export async function isClientVideoExportSupported(
  config: Partial<typeof DEFAULT_VIDEO_CONFIG> = {},
): Promise<{ supported: true; config: typeof DEFAULT_VIDEO_CONFIG & { codec: string } } | { supported: false; reason: string }> {
  const cfg = { ...DEFAULT_VIDEO_CONFIG, ...config };

  if (typeof window === 'undefined') {
    return { supported: false, reason: 'No window (SSR)' };
  }

  const VideoEncoderCtor = (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
  if (!VideoEncoderCtor) {
    return { supported: false, reason: 'VideoEncoder unavailable (WebCodecs not supported)' };
  }

  // Check encoding support — VideoEncoder.isConfigSupported is static
  const VE = VideoEncoderCtor as unknown as {
    isConfigSupported: (c: unknown) => Promise<{ supported: boolean }>;
  };

  const candidates: Array<typeof cfg & { codec: string }> = [
    cfg as typeof cfg & { codec: string },
    ...FALLBACK_CONFIGS.map((f) => ({ ...cfg, ...f }) as typeof cfg & { codec: string }),
  ];

  let lastReason = '';
  for (const candidate of candidates) {
    try {
      const result = await VE.isConfigSupported({
        codec: candidate.codec,
        width: candidate.width,
        height: candidate.height,
        bitrate: candidate.bitrate,
        framerate: candidate.framerate,
      });
      if (result.supported) {
        return { supported: true, config: candidate };
      }
      lastReason = `Codec ${candidate.codec} not supported for ${candidate.width}x${candidate.height}@${candidate.framerate}`;
    } catch (e) {
      lastReason = e instanceof Error ? e.message : String(e);
    }
  }
  return { supported: false, reason: lastReason || `Codec ${cfg.codec} not supported for ${cfg.width}x${cfg.height}@${cfg.framerate}` };
}
