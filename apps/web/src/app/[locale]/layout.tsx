import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { routing, Link } from '@/i18n/routing';
import { fontDisplay, fontData, fontBody } from '@/lib/fonts';
import { Navbar } from '@/components/layout/Navbar';
import { RouteFocus } from '@/components/RouteFocus';
import { localeUrl } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { citySlug } from '@/lib/city';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tCommon = await getTranslations('common');
  const tRoute = await getTranslations('routeDetail');

  const homeUrl = localeUrl(locale, '/');
  const languages = {
    id: localeUrl('id', '/'),
    en: localeUrl('en', '/'),
    'x-default': localeUrl('id', '/'),
  };

  return {
    title: {
      default: `${tCommon('appName')} — ${tCommon('metaTitle')}`,
      template: `%s | ${tCommon('appName')}`,
    },
    description: tCommon('metaDescription'),
    icons: {
      icon: '/icon',
      apple: '/apple-icon',
    },
    manifest: '/manifest.webmanifest',
    alternates: {
      languages,
    },
    openGraph: {
      title: `${tCommon('appName')} — ${tCommon('metaTitle')}`,
      description: tCommon('metaDescription'),
      url: homeUrl,
      locale: locale === 'id' ? 'id_ID' : 'en_US',
    },
    // Fallback copy so route pages always have a sensible description
    // even before per-route metadata resolves.
    keywords: [tRoute('metaKeywords').split(',')].flat(),
  };
}

export const viewport: Viewport = {
  themeColor: '#1F2A1E',
  colorScheme: 'light',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  let cities: { name: string }[] = [];
  try {
    const { data } = await supabase.from('cities').select('name').order('name');
    cities = (data as { name: string }[]) || [];
  } catch {
    // fallback gracefully
  }

  return (
    <html
      lang={locale}
      className={`${fontDisplay.variable} ${fontData.variable} ${fontBody.variable}`}
    >
      <body className="bg-paper text-ink font-body selection:bg-trail-orange selection:text-chalk flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="focus:bg-ink focus:text-chalk focus:font-data sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-[100] focus:rounded-[4px] focus:px-4 focus:py-2 focus:text-xs focus:uppercase"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none sm:px-6"
          >
            <RouteFocus />
            {children}
          </main>

          <footer className="border-contour-tan text-ink/60 font-body border-t py-6 text-xs">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-4">
              {cities.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-contour-tan/50 pb-4 text-[11px] font-data">
                  <span className="text-ink/80 font-bold uppercase tracking-wider">
                    {locale === 'id' ? 'KOTA POPULER:' : 'EXPLORE CITIES:'}
                  </span>
                  {cities.map((city) => (
                    <Link
                      key={city.name}
                      href={`/cities/${citySlug(city.name)}`}
                      className="text-ink/70 hover:text-ink transition-colors underline-offset-4 hover:underline"
                    >
                      {city.name}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex flex-col items-center justify-between gap-2 sm:flex-row text-center">
                <p className="font-display text-ink/70 tracking-wider uppercase">
                  RUTE UNIK © 2026
                </p>
                <p className="font-data text-[11px]">
                  {locale === 'id'
                    ? 'Didesain dengan estetika peta topografi & penanda jalur.'
                    : 'Designed with topographic & trail-marker aesthetic.'}
                </p>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
