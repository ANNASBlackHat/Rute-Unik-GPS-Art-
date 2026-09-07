import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { localeUrl } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('common');
  return {
    title: t('login'),
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: localeUrl(locale, '/login'),
    },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-12 px-4">
      <Suspense fallback={<div className="text-center font-data text-xs text-ink/50">Loading login form...</div>}>
        <LoginForm locale={locale} />
      </Suspense>
    </div>
  );
}
