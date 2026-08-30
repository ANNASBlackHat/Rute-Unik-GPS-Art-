import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest, response: NextResponse) {
  // 1. Check custom ruteunik_session cookie
  const sessionCookie = request.cookies.get('ruteunik_session');
  if (sessionCookie?.value) {
    try {
      const user = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString('utf8')
      );
      if (user && user.id) {
        return { user, response };
      }
    } catch {
      // Ignore parse failure
    }
  }

  // 2. Fallback to Supabase SSR client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response };
}
