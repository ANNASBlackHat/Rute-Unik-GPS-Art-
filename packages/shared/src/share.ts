export interface ShareMessageParams {
  routeName: string;
  cityName?: string | null;
  distanceKm?: string | number | null;
  elevationGain?: string | number | null;
  url: string;
  locale?: string | null;
}

/**
 * Builds a friendly, structured text message for sharing to messaging apps
 * like WhatsApp, Telegram, or copying to clipboard.
 */
export function buildShareMessage({
  routeName,
  cityName,
  distanceKm,
  elevationGain,
  url,
  locale = 'id',
}: ShareMessageParams): string {
  const isId = locale === 'id';

  const lines: string[] = [];
  lines.push(`🏃 *${routeName}* (GPS Art Route)`);

  if (cityName && cityName.trim()) {
    lines.push(`${isId ? '📍 Kota' : '📍 City'}: ${cityName.trim()}`);
  }

  if (distanceKm !== undefined && distanceKm !== null && String(distanceKm).trim()) {
    const distStr = String(distanceKm).trim();
    const formattedDist = distStr.endsWith('km') ? distStr : `${distStr} km`;
    lines.push(`${isId ? '📏 Jarak' : '📏 Distance'}: ${formattedDist}`);
  }

  if (elevationGain !== undefined && elevationGain !== null && String(elevationGain).trim()) {
    const elevStr = String(elevationGain).trim();
    lines.push(`${isId ? '⛰️ Elevasi' : '⛰️ Elevation'}: ${elevStr}`);
  }

  lines.push('');
  lines.push(
    isId
      ? 'Lihat rute & panduan navigasi:'
      : 'View route & turn-by-turn guide:'
  );
  lines.push(url);

  return lines.join('\n');
}

/**
 * Creates direct WhatsApp share link (for desktop web or HTTPS fallbacks).
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Creates WhatsApp custom URI scheme link (for mobile devices to trigger OS app chooser).
 */
export function getWhatsAppSchemeUrl(text: string): string {
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

/**
 * Creates direct Telegram share link.
 */
export function getTelegramShareUrl(url: string, text?: string): string {
  const base = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
  if (text) {
    return `${base}&text=${encodeURIComponent(text)}`;
  }
  return base;
}
