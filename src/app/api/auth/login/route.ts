import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined,
    });

    await client.connect();

    try {
      const query = `
        select 
          u.id, 
          u.email, 
          coalesce(p.full_name, 'Runner') as full_name,
          coalesce(p.role, 'runner') as role,
          (u.encrypted_password = extensions.crypt($2, u.encrypted_password)) as is_valid
        from auth.users u
        left join public.profiles p on p.id = u.id
        where lower(u.email) = lower($1)
        limit 1;
      `;

      const res = await client.query(query, [email, password]);

      if (res.rows.length === 0 || !res.rows[0].is_valid) {
        return NextResponse.json(
          { error: 'Invalid login credentials.' },
          { status: 401 }
        );
      }

      const user = {
        id: res.rows[0].id,
        email: res.rows[0].email,
        full_name: res.rows[0].full_name,
        role: res.rows[0].role,
      };

      const sessionToken = Buffer.from(JSON.stringify(user)).toString('base64');

      const response = NextResponse.json({ success: true, user });
      response.cookies.set('ruteunik_session', sessionToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } finally {
      await client.end();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
