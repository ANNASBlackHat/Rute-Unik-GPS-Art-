import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { UploadForm } from '@/components/upload/UploadForm';
import { parseCityWithCenter } from '@/lib/city';

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch available cities with center_point for auto-detection
  const { data: rawCities } = await supabase
    .from('cities')
    .select('id, name, center_point')
    .order('name');

  const cities = (rawCities || []).map((c) => parseCityWithCenter(c as { id: string; name: string; center_point: string | null }));

  return (
    <div className="py-6">
      <UploadForm cities={cities} locale={locale} />
    </div>
  );
}
