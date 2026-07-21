import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt, getAuthFromHeaders } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('modliq_token')?.value || getAuthFromHeaders(req.headers);
  const payload = token ? verifyJwt(token) : null;
  const session = payload ? { user: { id: payload.userId, email: payload.email } } : null;
  const { pathname } = req.nextUrl;

  const consoleRouteMatch = pathname.match(/^\/([^/]+)\/modliq-console/);
  
  const legacyRoutes = ['/dashboard', '/data-upload', '/goal', '/optimization-progress', '/results', '/studio', '/operations', '/supply-chain', '/lean'];
  if (legacyRoutes.some(route => pathname.startsWith(route))) {
    if (session?.user?.id) {
      const url = req.nextUrl.clone();
      url.pathname = `/${session.user.id}/modliq-console${pathname}`;
      return NextResponse.redirect(url);
    } else {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('login', 'true');
      return NextResponse.redirect(url);
    }
  }

  if (pathname === '/model-training') {
    if (session?.user?.id) {
      const url = req.nextUrl.clone();
      url.pathname = `/${session.user.id}/modliq-console/optimization-progress`;
      return NextResponse.redirect(url);
    } else {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('login', 'true');
      return NextResponse.redirect(url);
    }
  }
  
  if (consoleRouteMatch) {
    const routeUserId = consoleRouteMatch[1];

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('login', 'true');
      return NextResponse.redirect(url);
    }

    const userId = session.user?.id;
    if (userId && userId !== routeUserId) {
      const url = req.nextUrl.clone();
      url.pathname = `/${userId}/modliq-console/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
