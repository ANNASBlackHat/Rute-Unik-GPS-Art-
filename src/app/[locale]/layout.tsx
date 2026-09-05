import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { routing } from '@/i18n/routing';
import { fontDisplay, fontData, fontBody } from '@/lib/fonts';
import { Navbar } from '@/components/layout/Navbar';
import { RouteFocus } from '@/components/RouteFocus';
import { localeUrl } from '@/lib/site';
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
      canonical: homeUrl,
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

          <footer className="border-contour-tan text-ink/60 font-body border-t py-6 text-center text-xs">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
              <p className="font-display text-ink/70 tracking-wider uppercase">
                RUTE UNIK © 2026
              </p>
              <p className="font-data text-[11px]">
                {locale === 'id'
                  ? 'Didesain dengan estetika peta topografi & penanda jalur.'
                  : 'Designed with topographic & trail-marker aesthetic.'}
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
