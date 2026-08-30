import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Run i18n middleware
  const response = intlMiddleware(request);

  // 2. Check if the target route requires authentication or admin privileges
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/^\/(id|en)/);
  const locale = match ? match[1] : 'id';

  const isAdminRoute = /^\/(id|en)\/admin(\/.*)?$/.test(pathname);
  const isProtected = /^\/(id|en)\/(upload|me)(\/.*)?$/.test(pathname) || isAdminRoute;

  if (isProtected) {
    const { user } = await updateSession(request, response);

    if (!user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && user.role !== 'admin') {
      // Non-admin trying to access /admin -> redirect to /me
      return NextResponse.redirect(new URL(`/${locale}/me`, request.url));
    }
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames, excluding api and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
