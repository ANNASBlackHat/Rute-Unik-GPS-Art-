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
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return { user: null };

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
  } catch {
    return { user: null };
  }
}
