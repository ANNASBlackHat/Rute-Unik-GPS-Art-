import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest, response: NextResponse) {
  let supabaseResponse = response;

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
          supabaseResponse = NextResponse.next({ request });
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

  if (!authUser) {
    return { user: null, response: supabaseResponse };
  }

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
