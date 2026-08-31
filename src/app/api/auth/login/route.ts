import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Client } from 'pg';
import { encodeFallbackUser } from '@/lib/auth-fallback';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      // Fetch authoritative profile
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', data.user.id).single();

      const user = {
        id: data.user.id,
        email: data.user.email || email,
        full_name: profile?.full_name || (data.user.user_metadata?.full_name as string) || 'Runner',
        role: profile?.role || 'runner',
      };

      // Clear legacy fallback cookie if present (now using supabase session)
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('ruteunik_session', '', { path: '/', maxAge: 0 });

      return response;
    }

    console.error('supabase signIn error:', error);
    // Fallback to direct DB verification when Supabase Auth is unavailable (e.g., Database error querying schema)
    const isDbError = error?.message?.includes('Database error') || error?.message?.includes('unexpected_failure');
    if (!isDbError) {
      return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 });
    }

    // Direct DB fallback (emergency) - verify via pg crypt and issue signed fallback session
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      const res = await client.query(
        `
        select u.id, u.email, coalesce(p.full_name, 'Runner') as full_name, coalesce(p.role, 'runner') as role,
               (u.encrypted_password = extensions.crypt($2, u.encrypted_password)) as is_valid
        from auth.users u
        left join public.profiles p on p.id = u.id
        where lower(u.email) = lower($1)
        limit 1;
        `,
        [email, password]
      );
      if (res.rows.length === 0 || !res.rows[0].is_valid) {
        return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 });
      }
      const user = {
        id: res.rows[0].id,
        email: res.rows[0].email,
        full_name: res.rows[0].full_name,
        role: res.rows[0].role,
      };
      const signedCookie = await encodeFallbackUser(user);
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('ruteunik_session', signedCookie, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
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
