import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getSiteUrl } from '@/lib/site';
import { citySlug } from '@/lib/city';

export const revalidate = 3600;

const LOCALES = ['id', 'en'] as const;

function languagesFor(
  path: string,
): MetadataRoute.Sitemap[number]['alternates'] {
  return {
    languages: {
      id: `${getSiteUrl()}/id${path}`,
      en: `${getSiteUrl()}/en${path}`,
      'x-default': `${getSiteUrl()}/id${path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // Homepages for both locales
  const homepageEntries: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: `${base}/${locale}`,
    changeFrequency: 'daily',
    priority: 1,
    alternates: languagesFor('/'),
    lastModified: new Date(),
  }));

  // Cities hub pages (both locales)
  let cityNames: { name: string }[] = [];
  try {
    const { data } = await supabase.from('cities').select('name');
    cityNames = (data as { name: string }[]) || [];
  } catch {
    // fall back to homepages/routes only if the DB is unreachable at build time
  }

  const cityEntries: MetadataRoute.Sitemap = cityNames.flatMap((c) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}/cities/${citySlug(c.name)}`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: new Date(),
      alternates: languagesFor(`/cities/${citySlug(c.name)}`),
    })),
  );

  // Published route pages (exclude pending/rejected)
  let routeIds: { id: string }[] = [];
  try {
    const { data } = await supabase
      .from('routes')
      .select('id')
      .in('status', ['official', 'community']);
    routeIds = (data as { id: string }[]) || [];
  } catch {
    // fall back to homepages/cities only if the DB is unreachable at build time
  }

  const routeEntries: MetadataRoute.Sitemap = routeIds.flatMap((r) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}/routes/${r.id}`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
      alternates: languagesFor(`/routes/${r.id}`),
    })),
  );

  return [...homepageEntries, ...cityEntries, ...routeEntries];
}
