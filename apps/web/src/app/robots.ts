import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/*/admin',
        '/*/admin/*',
        '/login',
        '/*/login',
        '/me',
        '/*/me',
        '/*/me/*',
        '/upload',
        '/*/upload',
        '/api/*',
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
