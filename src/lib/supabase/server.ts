import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('ruteunik_session');

  if (sessionCookie?.value) {
    try {
      const user = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString('utf8')
      );
      if (user && user.id && user.email) {
        return { user };
      }
    } catch {
      // Ignore parse failure
    }
  }

  // Fallback to Supabase client auth
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role || 'runner',
        },
      };
    }
  } catch {
    // Ignore error
  }

  return { user: null };
}
