import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Set default Cache-Control header for caching (align with revalidate = 60)
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');

  // Add pathname to response headers for use in layout
  response.headers.set('x-current-pathname', pathname);

  // Redirect /rss and /rss.xml to /feed (for root)
  if (pathname === '/rss' || pathname === '/rss.xml') {
    console.log(`Redirecting ${pathname} to /feed`);
    return NextResponse.redirect(new URL('/feed', url));
  }

  // [Rest of your redirect logic remains the same...]

  // Existing sitemap rewrite logic
  if (pathname.startsWith('/post-sitemap') && pathname.endsWith('.xml')) {
    const pageMatch = pathname.match(/post-sitemap(\d+)\.xml/);
    if (pageMatch) {
      const page = pageMatch[1];
      url.pathname = '/sitemap-post';
      url.searchParams.set('page', page);
      console.log(`Rewriting ${pathname} to /sitemap-post?page=${page}`);
      return NextResponse.rewrite(url, { request: { headers: response.headers } });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/post-sitemap:page.xml',
    '/rss',
    '/rss.xml',
    '/:categorySlug/(rss|rss.xml)',
    '/:categorySlug/:postSlug/(rss|rss.xml)',
    '/tags/:tagSlug/(rss|rss.xml)',
    '/((?!api|_next|static).*)', // Add this to apply to all pages
  ],
};