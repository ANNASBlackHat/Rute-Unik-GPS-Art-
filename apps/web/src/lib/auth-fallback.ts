function getFallbackSecret(): string {
  return process.env.AUTH_FALLBACK_SECRET || process.env.DATABASE_URL || 'rute-unik-fallback-secret-2026';
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function signFallbackPayload(payload: string): Promise<string> {
  const secret = getFallbackSecret();
  const sig = await hmacSha256(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyFallbackSignature(value: string): Promise<string | null> {
  const secret = getFallbackSecret();
  const idx = value.lastIndexOf('.');
  if (idx === -1) return null;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = await hmacSha256(payload, secret);
  if (sig.length !== expected.length) return null;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  return payload;
}

export async function encodeFallbackUser(user: { id: string; email: string; full_name?: string; role?: string }): Promise<string> {
  const json = JSON.stringify(user);
  const payload = base64UrlEncode(new TextEncoder().encode(json));
  return signFallbackPayload(payload);
}

export async function decodeFallbackUser(value: string): Promise<{ id: string; email: string; full_name?: string; role?: string } | null> {
  const payload = await verifyFallbackSignature(value);
  if (!payload) return null;
  try {
    const bytes = base64UrlDecode(payload);
    const json = new TextDecoder().decode(bytes);
    const user = JSON.parse(json);
    if (user && user.id && user.email) return user;
    return null;
  } catch {
    return null;
  }
}
