import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { Client } from 'pg';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    await client.query(`delete from public.route_duplicate_flags where id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } finally {
    await client.end();
  }
}
