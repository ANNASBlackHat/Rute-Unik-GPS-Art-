import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 });
    }

    // Fetch authoritative profile
    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', data.user.id).single();

    const user = {
      id: data.user.id,
      email: data.user.email || email,
      full_name: profile?.full_name || (data.user.user_metadata?.full_name as string) || 'Runner',
      role: profile?.role || 'runner',
    };

    // Clear legacy unsigned cookie if present
    const response = NextResponse.json({ success: true, user });
    response.cookies.set('ruteunik_session', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
