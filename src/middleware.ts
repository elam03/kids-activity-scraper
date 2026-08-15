import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('admin-session')?.value;

  const isLoginPage = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    if (!sessionToken || sessionToken !== 'authenticated') {
      // Redirect to login if not authenticated
      if (!isLoginPage) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // Redirect to dashboard if authenticated and trying to access login page
      if (isLoginPage) {
        const dashboardUrl = new URL('/admin', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
