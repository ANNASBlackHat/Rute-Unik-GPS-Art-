import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { UploadForm } from '@/components/upload/UploadForm';

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch available cities
  const { data: cities } = await supabase
    .from('cities')
    .select('id, name')
    .order('name');

  return (
    <div className="py-6">
      <UploadForm cities={cities || []} locale={locale} />
    </div>
  );
}
