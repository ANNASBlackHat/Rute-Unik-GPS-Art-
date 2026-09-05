import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { getDbClient } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const client = await getDbClient();

  try {
    await client.query(`delete from public.route_duplicate_flags where id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } finally {
    await client.end();
  }
}
