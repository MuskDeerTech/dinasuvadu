import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures the route is dynamic and not cached indefinitely

// Utility function to escape special characters for XML
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Utility function to wrap content in CDATA
function wrapInCDATA(content: string): string {
  if (!content) return '';
  return `<![CDATA[${content}]]>`;
}

// Utility function to extract plain text from richText content (if available)
function extractPlainTextFromRichText(content: any): string {
  if (!content?.root?.children) return '';
  return content.root.children
    .map((block: any) => block.children.map((child: any) => child.text).join(''))
    .join('\n');
}

// Utility function to fetch tag details by slug
async function fetchTagBySlug(tagSlug: string): Promise<{ id: string; title: string; slug: string } | null> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/tags?where[slug][equals]=${tagSlug}&depth=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const tag = data.docs?.[0];
    if (!tag) return null;

    return {
      id: tag.id,
      title: tag.title || tagSlug,
      slug: tag.slug || tagSlug,
    };
  } catch (error) {
    return null;
  }
}

// Utility function to fetch category details by slug (for post URL construction)
async function fetchCategoryBySlug(categorySlug: string): Promise<{ id: string; title: string; slug: string; parent?: string | { id: string; slug: string } } | null> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories?where[slug][equals]=${categorySlug}&depth=2`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const category = data.docs?.[0];
    if (!category) return null;

    return {
      id: category.id,
      title: category.title || categorySlug,
      slug: category.slug || categorySlug,
      parent: category.parent || null,
    };
  } catch (error) {
    return null;
  }
}

// Utility function to fetch parent category details by ID (for post URL construction)
async function fetchParentCategory(parentId: string): Promise<{ slug: string; title: string } | null> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${parentId}?depth=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const parentCategory = await response.json();
    return {
      slug: parentCategory.slug || 'uncategorized',
      title: parentCategory.title || 'Uncategorized',
    };
  } catch (error) {
    return null;
  }
}

// Utility function to construct the post URL based on category
async function getPostUrl(post: any, baseUrl: string): Promise<string> {
  const category = post.categories?.[0];
  if (!category) {
    return `${baseUrl}/uncategorized/${post.slug}`;
  }

  const categoryDetails = await fetchCategoryBySlug(category.slug);
  if (!categoryDetails) {
    return `${baseUrl}/uncategorized/${post.slug}`;
  }

  if (categoryDetails.parent) {
    const parentId = typeof categoryDetails.parent === 'string' ? categoryDetails.parent : categoryDetails.parent.id;
    const parentCategory = await fetchParentCategory(parentId);
    if (!parentCategory) {
      return `${baseUrl}/${categoryDetails.slug}/${post.slug}`;
    }
    return `${baseUrl}/${parentCategory.slug}/${categoryDetails.slug}/${post.slug}`;
  }

  return `${baseUrl}/${categoryDetails.slug}/${post.slug}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tagSlug: string }> }
) {
  const params = await context.params; // Resolve the Promise
  const { tagSlug } = params;

  // Use the base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Fetch the tag by slug
  const tag = await fetchTagBySlug(tagSlug);
  if (!tag) {
    return new NextResponse(`Tag not found: ${tagSlug}`, { status: 404 });
  }

  // Fetch posts for this tag
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/posts?limit=50&sort=-publishedAt&where[_status][equals]=published&where[tags][contains]=${tag.id}&depth=2`;

  let allPosts = [];
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allPosts = data.docs || [];

    if (allPosts.length === 0) {
      return new NextResponse(`No published posts available for tag: ${tagSlug}`, { status: 404 });
    }
  } catch (error) {
    return new NextResponse(`Error fetching posts: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }

  // Filter posts to ensure only published ones with required fields are included
  const filteredPosts = allPosts.filter((post: any) =>
    post._status === 'published' &&
    post.slug &&
    post.publishedAt &&
    post.title &&
    post.meta?.description
  );

  if (filteredPosts.length === 0) {
    return new NextResponse(`No valid posts available for tag RSS feed: ${tagSlug}`, { status: 404 });
  }

  // Sort posts by publishedAt in descending order (newest first) as a fallback
  filteredPosts.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Generate RSS feed XML
  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
  xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
  xmlns:media="http://search.yahoo.com/mrss/"
>
  <channel>
    <title>Dinasuvadu - ${escapeXml(tag.title)}</title>
    <atom:link href="${baseUrl}/tags/${tagSlug}/feed" rel="self" type="application/rss+xml" />
    <link>${baseUrl}/tags/${tagSlug}</link>
    <description>Tamil News, Breaking News tagged with ${escapeXml(tag.title)}, தமிழ் செய்திகள்</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>ta</language>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <generator>Next.js with Payload CMS</generator>
    <image>
      <url>${baseUrl}/dinasuvadu.svg</url>
      <title>Dinasuvadu - ${escapeXml(tag.title)}</title>
      <link>${baseUrl}/tags/${tagSlug}</link>
      <width>32</width>
      <height>32</height>
    </image>
    ${await Promise.all(filteredPosts.map(async (post: any) => {
      const authorName = post.populatedAuthors?.[0]?.name || 'Dinasuvadu Team';
      const categories = Array.isArray(post.categories) ? post.categories.map((cat: any) => cat.name || cat.title).filter(Boolean) : [];
      const imageUrl = post.heroImage?.url || post.meta?.image?.url || null;
      const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`) : null;
      const imageAlt = post.heroImage?.alt || post.meta?.image?.alt || post.title;
      const postContent = post.content ? extractPlainTextFromRichText(post.content) : (post.meta?.description || '');
      const shortDescription = postContent.length > 200 ? postContent.substring(0, 200) + '...' : postContent;
      const postUrl = await getPostUrl(post, baseUrl);

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="false">${postUrl}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${wrapInCDATA(authorName)}</dc:creator>
      ${categories
        .map((category: string) => `<category>${wrapInCDATA(category)}</category>`)
        .join('')}
      <description>${wrapInCDATA(
        (fullImageUrl ? `<img src="${fullImageUrl}" alt="${escapeXml(imageAlt)}" />` : '') +
        shortDescription
      )}</description>
      <content:encoded>${wrapInCDATA(
        (fullImageUrl ? `<img src="${fullImageUrl}" alt="${escapeXml(imageAlt)}" />` : '') +
        `<p>${postContent.split('\n').join('</p><p>')}</p>`
      )}</content:encoded>
      ${fullImageUrl ? `
      <media:content url="${fullImageUrl}" medium="image">
        <media:title>${escapeXml(post.title)}</media:title>
      </media:content>` : ''}
    </item>`;
    }))}
  </channel>
</rss>
`;

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}