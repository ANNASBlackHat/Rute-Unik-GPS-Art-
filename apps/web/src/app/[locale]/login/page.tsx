import React, { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';

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
