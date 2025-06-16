// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/post-sitemap')) {
    const pageMatch = pathname.match(/post-sitemap(\d+)\.xml/);
    if (pageMatch) {
      const page = pageMatch[1];
      console.log(`Rewriting ${pathname} to /sitemap-post?page=${page}`);
      return NextResponse.rewrite(new URL(`/sitemap-post?page=${page}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/post-sitemap:page.xml'],
};