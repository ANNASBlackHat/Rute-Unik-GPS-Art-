import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDbClient } from '@/lib/db';
import { Card } from '@/components/ui/Card';

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await getAuthUser();
  if (!user || user.role !== 'admin') redirect(`/${locale}/admin`);

  interface AnalyticsRow {
    id: string;
    name: string;
    city_name: string | null;
    status: string;
    view_count: number;
    share_count: number;
    download_count: number;
    start_count: number;
    score: number;
  }

  const c = await getDbClient();
  let rows: AnalyticsRow[] = [];
  try {
    const r = await c.query(`
      select r.id, r.name, c.name as city_name, r.status,
             coalesce(r.view_count,0) as view_count,
             coalesce(r.share_count,0) as share_count,
             coalesce(r.download_count,0) as download_count,
             coalesce(r.start_count,0) as start_count,
             (coalesce(r.view_count,0)*1 + coalesce(r.share_count,0)*5 + coalesce(r.download_count,0)*3 + coalesce(r.start_count,0)*4) as score
      from public.routes r left join public.cities c on c.id=r.city_id
      order by score desc, view_count desc limit 50
    `);
    rows = r.rows;
  } finally { await c.end().catch(()=>{}); }

  const maxScore = Math.max(...rows.map(r=>r.score), 1);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-lg uppercase text-ink">Top Routes — Most Used</h2>
        <p className="text-xs text-ink/60">Ranked by weighted score: views×1 + shares×5 + downloads×3 + starts×4</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-data">
            <thead>
              <tr className="border-b border-contour-tan bg-paper/60 text-ink/70">
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Route</th>
                <th className="text-left px-3 py-2">City</th>
                <th className="text-right px-3 py-2">Views</th>
                <th className="text-right px-3 py-2">Shares</th>
                <th className="text-right px-3 py-2">Downloads</th>
                <th className="text-right px-3 py-2">Starts</th>
                <th className="text-right px-3 py-2">Score</th>
                <th className="px-3 py-2">Bar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i)=>(
                <tr key={r.id} className="border-b border-contour-tan/30">
                  <td className="px-3 py-2">{i+1}</td>
                  <td className="px-3 py-2 font-display uppercase">{r.name}</td>
                  <td className="px-3 py-2">{r.city_name}</td>
                  <td className="px-3 py-2 text-right">{r.view_count}</td>
                  <td className="px-3 py-2 text-right">{r.share_count}</td>
                  <td className="px-3 py-2 text-right">{r.download_count}</td>
                  <td className="px-3 py-2 text-right">{r.start_count}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.score}</td>
                  <td className="px-3 py-2 w-32">
                    <div className="h-2 bg-paper rounded-full overflow-hidden border border-contour-tan/50">
                      <div className="h-full bg-trail-orange" style={{ width: `${(r.score/maxScore)*100}%`}} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length===0 && <p className="p-6 text-center text-sm text-ink/60">No routes yet.</p>}
      </Card>
    </div>
  );
}
