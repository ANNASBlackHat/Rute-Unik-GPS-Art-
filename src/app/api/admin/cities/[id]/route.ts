import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { Client } from 'pg';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { name, country } = body;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    const query = `
      update public.cities 
      set name = coalesce($1, name),
          country = coalesce($2, country)
      where id = $3
      returning id, name, country;
    `;

    const res = await client.query(query, [name, country, id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, city: res.rows[0] });
  } finally {
    await client.end();
  }
}
