import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Client } from 'pg';
import { decodeFallbackUser } from '@/lib/auth-fallback';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored if called in Server Component
          }
        },
      },
    }
  );
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export async function getAuthUser(): Promise<{ user: AuthUser | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      // Fetch profile for authoritative role/full_name (defense against user_metadata tampering)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();

      return {
        user: {
          id: authUser.id,
          email: authUser.email || '',
          full_name: profile?.full_name || (authUser.user_metadata?.full_name as string | undefined),
          role: profile?.role || 'runner',
        },
      };
    }
  } catch {
    // ignore and try fallback
  }

  // Fallback: verify signed ruteunik_session cookie via direct DB (emergency when Supabase Auth is down)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ruteunik_session');
    if (!sessionCookie?.value) return { user: null };
    const decoded = await decodeFallbackUser(sessionCookie.value);
    if (!decoded) return { user: null };

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      const res = await client.query(
        `select u.id, u.email, coalesce(p.full_name, 'Runner') as full_name, coalesce(p.role, 'runner') as role
         from auth.users u left join public.profiles p on p.id = u.id where u.id = $1 limit 1`,
        [decoded.id]
      );
      if (res.rows.length === 0) return { user: null };
      // Ensure email matches to prevent id substitution
      if (res.rows[0].email.toLowerCase() !== decoded.email.toLowerCase()) return { user: null };
      return {
        user: {
          id: res.rows[0].id,
          email: res.rows[0].email,
          full_name: res.rows[0].full_name,
          role: res.rows[0].role,
        },
      };
    } finally {
      await client.end();
    }
  } catch {
    return { user: null };
  }

  return { user: null };
}
