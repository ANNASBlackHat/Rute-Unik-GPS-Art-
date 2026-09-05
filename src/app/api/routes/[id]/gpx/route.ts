import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return new NextResponse('Route ID required', { status: 400 });
  }

  const { data: route, error } = await supabase
    .from('routes')
    .select('id, name, gpx_raw')
    .eq('id', id)
    .single();

  if (error || !route || !route.gpx_raw) {
    return new NextResponse('GPX file not found', { status: 404 });
  }

  // fire-and-forget download counter
  try {
    const { getDbClient } = await import('@/lib/db');
    const c = await getDbClient();
    await c.query('update public.routes set download_count = coalesce(download_count,0)+1 where id=$1', [id]);
    await c.end().catch(() => {});
  } catch {}

  const safeFilename =
    route.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'route';

  return new NextResponse(route.gpx_raw, {
    status: 200,
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.gpx"`,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
