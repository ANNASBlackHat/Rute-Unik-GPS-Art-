import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6 py-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-data px-1.5 py-0.5 rounded-[3px] border border-trail-orange/40 bg-trail-orange/10 text-trail-orange uppercase font-bold">
            ADMINISTRATOR
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight">
          KURASI & MANAJEMEN RUTE
        </h1>
        <p className="font-body text-xs text-ink/70">
          Tinjau kiriman komunitas, verifikasi duplikasi jalur, dan kelola direktori kota.
        </p>
      </div>

      <AdminNav locale={locale} />

      <div>{children}</div>
    </div>
  );
}
