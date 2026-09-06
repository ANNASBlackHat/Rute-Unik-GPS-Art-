import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { getDbClient } from '@/lib/db';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;
  const c = await getDbClient();
  try {
    try {
      const r = await c.query(`
        select p.id, p.email, p.full_name, p.role, p.created_at,
               count(r2.id)::int as route_count
        from public.profiles p
        left join public.routes r2 on r2.uploaded_by = p.id
        group by p.id order by p.created_at desc
      `);
      return NextResponse.json({ users: r.rows });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist')) {
        try {
          const r2 = await c.query(`select id, email, raw_user_meta_data->>'full_name' as full_name, coalesce(raw_user_meta_data->>'role','runner') as role, created_at from auth.users order by created_at desc`);
          return NextResponse.json({
            users: r2.rows.map((u: Record<string, unknown>) => ({ ...u, route_count: 0 })),
            warning: 'profiles fallback to auth.users',
          });
        } catch {}
      }
      return NextResponse.json({ users: [], warning: msg });
    }
  } finally { await c.end().catch(()=>{}); }
}
