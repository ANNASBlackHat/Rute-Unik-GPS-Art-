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
    await c.query('update public.routes set share_count = coalesce(share_count,0)+1 where id=$1', [id]);
    const r = await c.query('select share_count from public.routes where id=$1', [id]);
    return NextResponse.json({ ok: true, share_count: r.rows[0]?.share_count });
  } finally {
    await c.end().catch(() => {});
  }
}
