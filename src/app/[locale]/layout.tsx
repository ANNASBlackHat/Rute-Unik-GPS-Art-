import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { fontDisplay, fontData, fontBody } from '@/lib/fonts';
import { Navbar } from '@/components/layout/Navbar';
import { RouteFocus } from '@/components/RouteFocus';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
      <body className="bg-paper text-ink min-h-screen font-body antialiased flex flex-col selection:bg-trail-orange selection:text-chalk">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-[100] focus:bg-ink focus:text-chalk focus:px-4 focus:py-2 focus:rounded-[4px] focus:font-data focus:text-xs focus:uppercase">
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />

          <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 focus:outline-none">
            <RouteFocus />
            {children}
          </main>

          <footer className="border-t border-contour-tan py-6 text-center text-xs text-ink/60 font-body">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="font-display tracking-wider uppercase text-ink/70">
                RUTE UNIK © 2026
              </p>
              <p className="text-[11px] font-data">
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
