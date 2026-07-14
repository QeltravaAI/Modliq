import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function middleware(req: NextRequest) {
  const { supabase, supabaseResponse } = createClient(req);

  const { data: { session } } = await supabase.auth.getSession();
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

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
