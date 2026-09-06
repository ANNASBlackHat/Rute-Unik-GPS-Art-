import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const c = await getDbClient();
  try {
    await c.query('update public.routes set start_count = coalesce(start_count,0)+1 where id=$1', [id]);
    const r = await c.query('select start_count from public.routes where id=$1', [id]);
    return NextResponse.json({ ok: true, start_count: r.rows[0]?.start_count });
  } finally {
    await c.end().catch(() => {});
  }
}
