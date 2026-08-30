import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

/**
 * GET /api/render-jobs/:id
 * Poll target for server-side render (spec §4.4).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Synthetic fallback IDs from the POST fallback path have no DB row
  if (id.startsWith('fallback-')) {
    return NextResponse.json({
      id,
      status: 'queued',
      output_url: null,
      message: 'Synthetic job — no worker. Apply migrations and run the Pillow+ffmpeg worker for real output.',
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const res = await client.query(
      `select id, route_id, status, params, output_url, error_message, created_at, updated_at
       from public.render_jobs where id = $1`,
      [id],
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
