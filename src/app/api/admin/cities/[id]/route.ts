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
    // Check if city has routes
    const countRes = await client.query('select count(*)::int as cnt from public.routes where city_id = $1', [id]);
    const cnt = Number(countRes.rows[0]?.cnt || 0);
    if (cnt > 0) {
      return NextResponse.json(
        { error: `Cannot delete city with ${cnt} route(s). Remove or reassign routes first.` },
        { status: 400 }
      );
    }

    const delRes = await client.query('delete from public.cities where id = $1 returning id', [id]);
    if (delRes.rows.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } finally {
    await client.end();
  }
}
