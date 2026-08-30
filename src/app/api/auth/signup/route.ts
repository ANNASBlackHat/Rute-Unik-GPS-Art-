import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Valid email and password (min 6 chars) are required.' },
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
      // Check if user already exists
      const existing = await client.query(
        'select id from auth.users where lower(email) = lower($1)',
        [email]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'User already registered with this email.' },
          { status: 400 }
        );
      }

      // Insert new user
      const userRes = await client.query(
        `
        insert into auth.users (
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_sso_user,
          created_at,
          updated_at
        )
        values (
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $1,
          extensions.crypt($2, extensions.gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', $3::text, 'role', 'runner'),
          false,
          now(),
          now()
        )
        returning id;
      `,
        [email, password, fullName || email.split('@')[0]]
      );

      const userId = userRes.rows[0].id;

      // Insert identity
      await client.query(
        `
        insert into auth.identities (
          id,
          user_id,
          provider_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        )
        values (
          $1::uuid,
          $1::uuid,
          $1::text,
          jsonb_build_object('sub', $1::text, 'email', $2::text),
          'email',
          now(),
          now(),
          now()
        )
        on conflict (provider, provider_id) do nothing;
      `,
        [userId, email]
      );

      // Insert profile
      await client.query(
        `
        insert into public.profiles (id, email, full_name, role)
        values ($1::uuid, $2::text, $3::text, 'runner')
        on conflict (id) do nothing;
      `,
        [userId, email, fullName || email.split('@')[0]]
      );

      const user = {
        id: userId,
        email,
        full_name: fullName || email.split('@')[0],
        role: 'runner',
      };

      const sessionToken = Buffer.from(JSON.stringify(user)).toString('base64');
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('ruteunik_session', sessionToken, {
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
