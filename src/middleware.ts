import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle locale-prefixed auth callback (e.g., /id/auth/callback from old redirects) -> redirect to /auth/callback
  if (/^\/(id|en)\/auth\/callback/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // Bypass i18n for auth callback (must stay at /auth/callback, not /id/auth/callback)
  if (pathname.startsWith('/auth/') || pathname === '/auth') {
    const response = NextResponse.next();
    const { response: supabaseResponse } = await updateSession(
      request,
      response
    );
    return supabaseResponse;
  }

  // 1. Run i18n middleware
  let response = intlMiddleware(request);

  // 2. Check if the target route requires authentication or admin privileges
  const match = pathname.match(/^\/(id|en)/);
  const locale = match ? match[1] : 'id';

  const isAdminRoute = /^\/(id|en)\/admin(\/.*)?$/.test(pathname);
  const isProtected =
    /^\/(id|en)\/(upload|me)(\/.*)?$/.test(pathname) || isAdminRoute;

  if (isProtected) {
    const { user, response: supabaseResponse } = await updateSession(
      request,
      response
    );
    response = supabaseResponse;

    if (!user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && user.role !== 'admin') {
      // Non-admin trying to access /admin -> redirect to /me
      return NextResponse.redirect(new URL(`/${locale}/me`, request.url));
    }
  } else {
    // Still refresh session on non-protected routes so cookies stay fresh
    const { response: supabaseResponse } = await updateSession(
      request,
      response
    );
    response = supabaseResponse;
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames, excluding api, auth and static files
  matcher: ['/((?!api|auth|_next|_vercel|icon|apple-icon|.*\\..*).*)'],
};
