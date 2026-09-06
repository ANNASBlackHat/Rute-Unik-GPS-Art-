import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { getDbClient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const client = await getDbClient();

  try {
    const res = await client.query(
      `update public.routes set status = 'rejected' where id = $1 returning id, status;`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, route: res.rows[0] });
  } finally {
    await client.end();
  }
}
