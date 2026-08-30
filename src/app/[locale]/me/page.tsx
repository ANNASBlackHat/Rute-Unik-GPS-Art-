import React from 'react';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAuthUser } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase';
import { MyRoutesList, MyRouteItem } from '@/components/dashboard/MyRoutesList';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default async function ContributorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');
  const { user } = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/${locale}/me`);
  }

  // Fetch routes uploaded by this user
  const { data: rawRoutes } = await supabase
    .from('routes')
    .select(`
      id,
      name,
      distance_m,
      elevation_gain_m,
      status,
      thumbnail_svg,
      created_at,
      cities (
        name
      )
    `)
    .eq('uploaded_by', user.id)
    .order('created_at', { ascending: false });

  const routes: MyRouteItem[] = (rawRoutes || []).map((r) => ({
    id: r.id,
    name: r.name,
    city_name: (r.cities as unknown as { name?: string } | null)?.name || 'Unknown',
    distance_m: Number(r.distance_m),
    elevation_gain_m: r.elevation_gain_m ? Number(r.elevation_gain_m) : null,
    status: r.status as MyRouteItem['status'],
    thumbnail_svg: r.thumbnail_svg,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-8 py-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight">
          {t('myUploadsTitle')}
        </h1>
        <p className="font-body text-xs text-ink/70">
          {t('myUploadsSubtitle')}
        </p>
      </div>

      <MyRoutesList routes={routes} />

      <div className="pt-8 border-t border-contour-tan">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
