import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  const { user } = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Current and new password (min 6) required' }, { status: 400 });
  }
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  try {
    const check = await c.query(
      `select (encrypted_password = extensions.crypt($2, encrypted_password)) as ok from auth.users where id=$1`,
      [user.id, currentPassword]
    );
    if (!check.rows[0]?.ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    await c.query(`update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')), updated_at = now() where id=$1`, [user.id, newPassword]);
    return NextResponse.json({ ok: true });
  } finally {
    await c.end().catch(() => {});
  }
}
