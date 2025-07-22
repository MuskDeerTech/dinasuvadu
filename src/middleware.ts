import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Set Cache-Control header for all pages
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');

  // Add pathname to response headers
  response.headers.set('x-current-pathname', pathname);

  // Redirect /rss and /rss.xml to /feed, preserving path segments
  if (pathname.endsWith('/rss') || pathname.endsWith('/rss.xml')) {
    const newPath = pathname.replace(/\/(rss|rss\.xml)$/, '/feed');
    return NextResponse.redirect(new URL(newPath, url));
  }

  // Sitemap rewrite logic
  if (pathname.startsWith('/post-sitemap') && pathname.endsWith('.xml')) {
    const pageMatch = pathname.match(/post-sitemap(\d+)\.xml/);
    if (pageMatch) {
      const page = pageMatch[1];
      url.pathname = '/sitemap-post';
      url.searchParams.set('page', page);
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
    '/((?!api|_next|static|.*\\..*).*)', // Match all pages except API, _next, static, and files
  ],
};