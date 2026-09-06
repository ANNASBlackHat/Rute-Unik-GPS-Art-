import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { getDbClient } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;
  const { id } = await params;
  const client = await getDbClient();
  try {
    await client.query('delete from public.route_duplicate_flags where route_id=$1 or candidate_route_id=$1', [id]);
    await client.query('delete from public.route_views where route_id=$1', [id]).catch(() => {});
    const res = await client.query('delete from public.routes where id=$1 returning id', [id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } finally { await client.end(); }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { name, city_id, status } = body;

  const client = await getDbClient();

  try {
    const query = `
      update public.routes
      set name = coalesce($1, name),
          city_id = coalesce($2, city_id),
          status = coalesce($3, status)
      where id = $4
      returning id, name, city_id, status;
    `;

    const res = await client.query(query, [name, city_id, status, id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, route: res.rows[0] });
  } finally {
    await client.end();
  }
}
