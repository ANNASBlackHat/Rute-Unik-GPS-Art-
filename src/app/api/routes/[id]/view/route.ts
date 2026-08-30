import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  try {
    await c.query('update public.routes set view_count = coalesce(view_count,0)+1 where id=$1', [id]);
    await c.query('insert into public.route_views (route_id) values ($1)', [id]).catch(() => {});
    const r = await c.query('select view_count, share_count, download_count, start_count from public.routes where id=$1', [id]);
    return NextResponse.json({ ok: true, counts: r.rows[0] || null });
  } finally {
    await c.end().catch(() => {});
  }
}
