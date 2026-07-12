import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Match routes like /[userId]/modliq-console/...
  const consoleRouteMatch = pathname.match(/^\/([^/]+)\/modliq-console/);
  
  if (consoleRouteMatch) {
    const routeUserId = consoleRouteMatch[1];
    
    // If not logged in, redirect to home with a login prompt
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('login', 'true');
      return NextResponse.redirect(url);
    }
    
    // If logged in but trying to access another user's workspace
    if (token.id !== routeUserId && token.sub !== routeUserId) {
      const url = req.nextUrl.clone();
      url.pathname = `/${token.id || token.sub}/modliq-console/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
