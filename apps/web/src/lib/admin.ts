import { NextResponse } from 'next/server';
import { getAuthUser, AuthUser } from '@/lib/supabase/server';

export async function requireAdminUser(): Promise<
  { authorized: true; user: AuthUser } | { authorized: false; response: NextResponse }
> {
  const { user } = await getAuthUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      ),
    };
  }

  if (user.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden. Admin privileges required.' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}
