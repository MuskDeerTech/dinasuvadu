export const dynamic = 'force-dynamic'; // Ensures the route is dynamic and not cached indefinitely

// Cache to store category data and avoid repeated API calls
const categoryCache = new Map<string, any>();

// Utility function to fetch category details by slug with caching
async function fetchCategoryBySlug(slug: string): Promise<{ id: string; slug: string; parent?: string | { id: string; slug: string } } | null> {
  if (categoryCache.has(slug)) {
    return categoryCache.get(slug);
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories?where[slug][equals]=${slug}&depth=2`;
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
    if (!category) {
      return null;
    }

    const result = {
      id: category.id,
      slug: category.slug || slug,
      parent: category.parent || null,
    };

    categoryCache.set(slug, result);
    return result;
  } catch (error) {
    return null;
  }
}

// Utility function to fetch parent category details by ID
async function fetchParentCategory(parentId: string): Promise<{ slug: string } | null> {
  if (categoryCache.has(parentId)) {
    const cachedCategory = categoryCache.get(parentId);
    return {
      slug: cachedCategory.slug,
    };
  }

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
    const result = {
      slug: parentCategory.slug || 'uncategorized',
    };

    categoryCache.set(parentId, { slug: result.slug });
    return result;
  } catch (error) {
    return null;
  }
}

// Utility function to construct the post URL based on its category
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

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dev.dinasuvadu.com';

  // Extract page number from the query parameter first (from middleware rewrite)
  const url = new URL(request.url);
  const { searchParams } = url;
  const pageParam = searchParams.get('page');
  let page = parseInt(pageParam || '1', 10);

  // Fallback to URL path if query parameter is not present (for direct access to /sitemap-post)
  const pathname = url.pathname;
  if (!pageParam && pathname.startsWith('/post-sitemap')) {
    const pageMatch = pathname.match(/post-sitemap(\d+)\.xml/);
    if (pageMatch) {
      page = parseInt(pageMatch[1], 10);
    }
  }

  if (isNaN(page) || page < 1) {
    return new Response('Invalid page number', { status: 404 });
  }

  const postsPerPage = 2;

  // Fetch all posts from Payload CMS (without pagination initially)
  let allPosts = [];
  let totalPosts = 0;
  const limit = 100; // Fetch in batches of 100 to avoid overloading the API
  let currentPage = 1;

  try {
    while (true) {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/posts?limit=${limit}&page=${currentPage}&where[_status][equals]=published&depth=2`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = await response.json();
      const posts = data.docs || [];
      allPosts.push(...posts);
      totalPosts = data.totalDocs || 0;

      if (posts.length < limit) {
        // No more posts to fetch
        break;
      }
      currentPage++;
    }
  } catch (error) {
    return new Response('Error fetching posts', { status: 500 });
  }

  // Filter posts to ensure only published ones with a slug are included
  const filteredPosts = allPosts.filter((post: any) => post._status === 'published' && post.slug);

  // Sort posts by publishedAt in descending order (newest first), with a fallback to updatedAt or current date
  filteredPosts.sort((a: any, b: any) => {
    const dateA = a.publishedAt || a.updatedAt || new Date().toISOString();
    const dateB = b.publishedAt || b.updatedAt || new Date().toISOString();
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Apply pagination manually
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsForPage = filteredPosts.slice(startIndex, endIndex);

  // If no posts are found for this page, return a 404
  if (postsForPage.length === 0) {
    return new Response('No posts found for this page', { status: 404 });
  }

  // Map posts to sitemap entries with corrected <loc> links
  const postPages = await Promise.all(
    postsForPage.map(async (post: any) => {
      const postUrl = await getPostUrl(post, baseUrl);
      return {
        loc: postUrl,
        lastmod: post.updatedAt || post.publishedAt || new Date().toISOString(),
      };
    })
  );

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${postPages
    .map(
      (page: { loc: string; lastmod: string }) => `
  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });
}