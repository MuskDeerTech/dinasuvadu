export const dynamic = 'force-dynamic'; // Ensure the route is dynamic and not cached

// Reuse the category cache and utility functions from sitemap-post/route.ts
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
      headers: { 'Content-Type': 'application/json' },
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
    return { slug: cachedCategory.slug };
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${parentId}?depth=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const parentCategory = await response.json();
    const result = { slug: parentCategory.slug || 'uncategorized' };
    categoryCache.set(parentId, { slug: result.slug });
    return result;
  } catch (error) {
    return null;
  }
}

// Utility function to construct the post URL
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

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sub.dinasuvadu.com';
  const publicationName = 'Dinasuvadu'; // Replace with your publication name
  const publicationLanguage = 'ta'; // Replace with your language code (e.g., 'ta' for Tamil)

  // Calculate the date 48 hours ago (from 06:18 PM IST, June 30, 2025)
  const twoDaysAgo = new Date('2025-06-30T06:18:00+05:30'); // Current time
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48); // 06:18 PM IST, June 28, 2025

  // Fetch recent posts from Payload CMS
  let allPosts = [];
  const limit = 50; // Fetch in batches
  let currentPage = 1;

  try {
    while (true) {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/posts?limit=${limit}&page=${currentPage}&where[_status][equals]=published&where[publishedAt][greater_than]=${twoDaysAgo.toISOString()}&depth=2`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const posts = data.docs || [];
      allPosts.push(...posts);

      if (posts.length < limit) {
        break;
      }
      currentPage++;
    }
  } catch (error) {
    return new Response('Error fetching posts', { status: 500 });
  }

  // Filter posts to ensure only published ones with a slug and title are included
  const filteredPosts = allPosts.filter(
    (post: any) => post._status === 'published' && post.slug && post.title && post.publishedAt
  );

  // Sort posts by publishedAt in descending order
  filteredPosts.sort(
    (a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Limit to 1,000 posts (Google News guideline)
  const newsPosts = filteredPosts.slice(0, 1000);

  // Generate news sitemap entries
  const newsEntries = await Promise.all(
    newsPosts.map(async (post: any) => {
      try {
        const postUrl = await getPostUrl(post, baseUrl);
        const publicationDate = new Date(post.publishedAt).toISOString();
        const title = post.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Proper XML escaping
        return `
          <url>
            <loc>${postUrl}</loc>
            <news:news>
              <news:publication>
                <news:name>${publicationName}</news:name>
                <news:language>${publicationLanguage}</news:language>
              </news:publication>
              <news:publication_date>${publicationDate}</news:publication_date>
              <news:title>${title}</news:title>
            </news:news>
          </url>`;
      } catch (error) {
        return null; // Skip invalid entries
      }
    })
  ).then(entries => entries.filter(entry => entry !== null));

  // Generate news sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${newsEntries.join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });
}