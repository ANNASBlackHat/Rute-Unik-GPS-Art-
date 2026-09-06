import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDbClient } from '@/lib/db';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await getAuthUser();
  if (!user || user.role !== 'admin') redirect(`/${locale}/admin`);

  interface AdminUserRow {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    created_at: string;
    route_count: number;
  }

  const c = await getDbClient();
  let users: AdminUserRow[] = [];
  let warning: string | null = null;
  try {
    try {
      const r = await c.query(`select p.id, p.email, p.full_name, p.role, p.created_at, count(r2.id)::int as route_count from public.profiles p left join public.routes r2 on r2.uploaded_by=p.id group by p.id order by p.created_at desc`);
      users = r.rows;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist')) {
        // fallback: try auth.users directly (local dev without profiles sync)
        try {
          const r2 = await c.query(`select id, email, raw_user_meta_data->>'full_name' as full_name, coalesce(raw_user_meta_data->>'role','runner') as role, created_at from auth.users order by created_at desc`);
          users = r2.rows.map((u: Record<string, unknown>) => ({
            id: String(u.id),
            email: (u.email as string) || null,
            full_name: (u.full_name as string) || null,
            role: (u.role as string) || 'runner',
            created_at: String(u.created_at),
            route_count: 0,
          }));
        } catch {
          warning = 'Profiles table not initialized in local DB — run Supabase migrations.';
          users = [];
        }
      } else {
        warning = msg;
      }
    }
  } finally { await c.end().catch(()=>{}); }

  return (
    <div className="space-y-6">
      {warning && <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-[4px]">{warning}</div>}
      <h2 className="font-display text-lg uppercase text-ink">Registered Accounts — {users.length}</h2>
      <div className="overflow-x-auto border border-contour-tan rounded-[8px] bg-chalk">
        <table className="w-full text-xs font-data">
          <thead>
            <tr className="border-b border-contour-tan bg-paper/60 text-ink/70">
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Full Name</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-right px-3 py-2">Routes</th>
              <th className="text-right px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u)=>(
              <tr key={u.id} className="border-b border-contour-tan/50 text-ink">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-[3px] text-[11px] uppercase ${u.role==='admin'?'bg-ink text-chalk':'bg-paper border'}`}>{u.role}</span></td>
                <td className="px-3 py-2 text-right">{u.route_count}</td>
                <td className="px-3 py-2 text-right">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length===0 && <p className="p-6 text-center text-sm text-ink/60">No accounts yet.</p>}
      </div>
    </div>
  );
}
