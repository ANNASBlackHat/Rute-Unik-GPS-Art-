import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password (min 6 chars) are required.' }, { status: 400 });
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || email.split('@')[0], role: 'runner' } },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If email confirmation is required, Supabase returns user without session
    if (!data.session && data.user && !data.user.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        user: null,
        message: 'Check your email to confirm your account.',
        needsConfirmation: true,
      });
    }

    // Ensure profile exists (trigger handle_new_user should have created it, fallback if needed)
    if (data.user) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email,
          full_name: fullName || email.split('@')[0],
          role: 'runner',
        },
        { onConflict: 'id' }
      );
    }

    const user = data.user
      ? {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName || email.split('@')[0],
          role: 'runner',
        }
      : null;

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('ruteunik_session', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
