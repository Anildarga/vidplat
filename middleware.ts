import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Onboarding route: must be authenticated but not yet completed onboarding
    if (pathname.startsWith('/onboarding')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token.onboardingCompleted) {
        // Already done, redirect to appropriate dashboard
        const role = token.role as string;
        return NextResponse.redirect(new URL(`/${role.toLowerCase()}`, req.url));
      }
      return NextResponse.next();
    }

    // Onboarding is now optional - users can access all routes

    // Role-based access
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (pathname.startsWith('/instructor') && token?.role !== 'INSTRUCTOR' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/student/:path*',
    '/instructor/:path*',
    '/admin/:path*',
    '/learn/:path*',
    '/onboarding/:path*',
  ],
};
