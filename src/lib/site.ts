/**
 * Central site-URL helpers.
 *
 * All absolute URLs (metadataBase, canonicals, hreflang, sitemap, OG images)
 * are derived from a single source so they stay consistent across locales.
 */
const DEFAULT_SITE_URL = 'https://rute-unik.annasblackhat.my.id';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(
    /\/+$/,
    ''
  );
}

/**
 * Build an absolute, locale-prefixed URL.
 * e.g. localeUrl('en', '/routes/abc') -> 'https://.../en/routes/abc'
 */
export function localeUrl(locale: string, path = '/'): string {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const full = `${base}/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
  return full;
}
