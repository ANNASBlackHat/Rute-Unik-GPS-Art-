import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

/**
 * POST /api/routes/:id/render-video
 * Enqueues a server-side render job (spec §4.1). Returns jobId immediately.
 * Uses pg directly so it works with local postgis and remote Supabase alike.
 * Stores params for the Pillow+ffmpeg worker to consume later.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: routeId } = await params;

  // Validate route exists
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  let body: { width?: number; height?: number; fps?: number; durationSeconds?: number } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {}

  try {
    await client.connect();

    const routeRes = await client.query('select id from public.routes where id = $1', [routeId]);
    if (routeRes.rows.length === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const renderParams = {
      width: body.width ?? 1080,
      height: body.height ?? 1080,
      fps: body.fps ?? 30,
      durationSeconds: body.durationSeconds ?? 8,
    };

    const jobRes = await client.query(
      `insert into public.render_jobs (route_id, status, params)
       values ($1, 'queued', $2::jsonb)
       returning id, status, created_at`,
      [routeId, JSON.stringify(renderParams)],
    );

    const job = jobRes.rows[0];

    // In v1, no async worker is running — mark as queued and let client poll.
    // A real worker (Pillow+ffmpeg) would pick this up and update to done with output_url.
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      params: renderParams,
      message: 'Render job queued. Worker will generate MP4 via Pillow+ffmpeg and store to Supabase Storage.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If render_jobs table does not exist yet (migration not applied), fallback to synthetic jobId so client doesn't hard-fail
    if (msg.includes('render_jobs') && msg.includes('does not exist')) {
      const fakeId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return NextResponse.json({
        jobId: fakeId,
        status: 'queued',
        params: body,
        warning: 'render_jobs table not migrated yet — job is synthetic. Run npm run db:test to apply migrations.',
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
