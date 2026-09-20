import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySignedSessionToken } from '@/lib/security-utils';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('admin-session')?.value;
  const isAuthenticated = sessionToken ? await verifySignedSessionToken(sessionToken) : false;

  const isLoginPage = pathname === '/admin/login';
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminLoginApi = pathname === '/api/admin/login';

  // Protect Admin API endpoints
  if (isAdminApi && !isAdminLoginApi) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }
  }

  // Protect Admin UI Pages
  if (isAdminPage) {
    if (!isAuthenticated) {
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
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

