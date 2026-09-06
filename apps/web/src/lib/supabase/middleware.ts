import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { decodeFallbackUser } from '@/lib/auth-fallback';

export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabaseResponse = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    // Resolve role from profiles (authoritative, not JWT user_metadata)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', authUser.id)
      .single();

    const user = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: profile?.full_name || (authUser.user_metadata?.full_name as string | undefined),
      role: profile?.role || 'runner',
    };

    return { user, response: supabaseResponse };
  }

  // Fallback: signed ruteunik_session when Supabase Auth is down (edge-compatible, HMAC-verified, no DB query)
  const fallbackCookie = request.cookies.get('ruteunik_session');
  if (fallbackCookie?.value) {
    const decoded = await decodeFallbackUser(fallbackCookie.value);
    if (decoded) {
      // Trust HMAC-verified payload; role was authoritative at login time via DB
      const user = {
        id: decoded.id,
        email: decoded.email,
        full_name: decoded.full_name,
        role: decoded.role || 'runner',
      };
      return { user, response: supabaseResponse };
    }
  }

  return { user: null, response: supabaseResponse };
}
