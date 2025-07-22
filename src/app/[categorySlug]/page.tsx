// export const dynamic = 'force-static' ;
export const revalidate = 60;
import axios from "axios";
import Link from "next/link";
import Text from "antd/es/typography/Text";
import "antd/dist/reset.css";
import { notFound } from "next/navigation";
import Seo from "../../components/Seo";
import ShareButton from "../../components/ShareButton";

// Type definitions (aligned with provided files)
type Media = {
  url: string;
  alt?: string;
  caption?: string;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Author = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  title?: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string | null;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: Media;
  meta?: {
    description?: string;
    image?: Media;
  };
  categories?: Category[];
  populatedAuthors?: Author[];
  tags?: Tag[];
};

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

// Fetch a category by slug
async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const response = await axios.get(
      `${apiUrl}/api/categories?where[slug][equals]=${slug}&depth=2`
    );
    return response.data.docs[0] || null;
  } catch (error) {
    return null;
  }
}

// Fetch category details by ID
async function fetchCategoryById(
  categoryId: string
): Promise<{ title: string } | null> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/categories/${categoryId}?depth=1`
    );
    return res.data || null
      ? {
          title: res.data.title || "Uncategorized",
        }
      : null;
  } catch (err) {
    return null;
  }
}

// Fetch posts by category ID with pagination
async function fetchPostsByCategory(
  categoryId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const response = await axios.get(
      `${apiUrl}/api/posts?where[categories][in]=${categoryId}&sort=-publishedAt&depth=2&limit=${limit}&page=${page}`
    );
    return {
      posts: response.data.docs || [],
      total: response.data.totalDocs || 0,
    };
  } catch (error) {
    return { posts: [], total: 0 };
  }
}

// Fetch subcategories by parent category ID
async function fetchSubCategories(parentId: string): Promise<Category[]> {
  try {
    const response = await axios.get(
      `${apiUrl}/api/categories?where[parent][equals]=${parentId}&depth=1&limit=100`
    );
    return response.data.docs || [];
  } catch (error) {
    return [];
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug } = await params;
  const query = await searchParams;
  const page = parseInt(query.page || "1", 10);
  const limit = 10;

  // Fetch the parent category
  const category = await fetchCategoryBySlug(categorySlug);
  if (!category) {
    notFound();
  }

  // Ensure it's a top-level category (no parent)
  if (category.parent) {
    notFound();
  }

  // Fetch category title
  let categoryTitle = category.title || "Uncategorized";
  if (!category.title) {
    const fetchedCategory = await fetchCategoryById(category.id);
    if (fetchedCategory) {
      categoryTitle = fetchedCategory.title;
    }
  }

  // Fetch posts for the category
  const { posts, total } = await fetchPostsByCategory(category.id, page, limit);
  const totalPages = Math.ceil(total / limit);

  // Fetch subcategories
  const subCategories = await fetchSubCategories(category.id);

  // Calculate the pathname
  const pathname = `/${categorySlug}${page > 1 ? `?page=${page}` : ""}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.dinasuvadu.com";

  return (
    <>
      <Seo
        pageType="category"
        categoryTitle={categoryTitle}
        pathname={pathname}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: categoryTitle,
            url: `${baseUrl}${pathname}`,
            description: `Explore the latest posts in ${categoryTitle}`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((post, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: post.title,
                url: subCategories.length > 0
                  ? `${baseUrl}/${categorySlug}/${post.categories?.[0]?.slug || 'uncategorized'}/${post.slug}`
                    : `${baseUrl}/${categorySlug}/${post.slug}`,
              })),
            },
          }),
        }}
      />
      <div className="site site-main">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 text-sm font-medium text-gray-500"
        >
          <div className="flex items-center breadcrumbs">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-400">{">"}</span>
            <span className="text-gray-700">{categoryTitle}</span>
          </div>
        </nav>

        {/* Category Header */}
        <header className="mb-10">
          <h1 className="category-title">{categoryTitle}</h1>
        </header>


        {/* Posts Grid */}
        {posts.length > 0 ? (
          <>
            <div className="category-grid">
              {posts.map((post: Post) => {
                const imageUrl = getImageUrl(post.heroImage?.url);
                const imageAlt = post.heroImage?.alt || post.title;
                const postCategory = post.categories?.[0];
                const isSubCategory = postCategory?.parent;

                return (
                  <article
                    key={post.id}
                    className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="post-item-category api-title bor-1">
                      <div className="flex-1">
                        <Link
                          href={
                            isSubCategory
                              ? `/${categorySlug}/${postCategory?.slug || 'uncategorized'}/${post.slug}`
                              : `/${categorySlug}/${post.slug}`
                          }
                          className="flex flex-col h-full"
                        >
                          <h3 className="post-title-1">{post.title}</h3>
                          {post.meta?.description && (
                            <p className="post-description">
                              {post.meta.description}
                            </p>
                          )}
                        </Link>
                        <div className="post-first-tag">
                          {(post.tags ?? []).length > 0 && (
                            <Link href={`/tags/${(post.tags ?? [])[0].slug}`}>
                              <span className="text-blue-600 hover:underline">
                                {(post.tags ?? [])[0].name}
                              </span>
                            </Link>
                          )}
                          <ShareButton
                            url={`${baseUrl}/${categorySlug}/${post.slug}`}
                            title={post.title}
                            description={post.meta?.description}
                          />
                        </div>
                      </div>

                      {imageUrl ? (
                        <Link
                          href={
                            isSubCategory
                              ? `/${categorySlug}/${postCategory?.slug || 'uncategorized'}/${post.slug}`
                              : `/${categorySlug}/${post.slug}`
                          }
                          className="relative w-full h-48 overflow-hidden rounded-t-lg"
                        >
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No Image</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
                {page > 1 && (
                  <Link
                    href={`/${categorySlug}?page=${page - 1}`}
                    className="pagination-link"
                  >
                    Prev
                  </Link>
                )}

                {/* First Page */}
                <Link
                  href={`/${categorySlug}?page=1`}
                  className={`pagination-link ${page === 1 ? "active" : ""}`}
                >
                  1
                </Link>

                {/* Ellipsis after first page */}
                {page > 2 && <span className="pagination-ellipsis">…</span>}

                {/* Current Page */}
                {page !== 1 && page !== totalPages && (
                  <Link
                    href={`/${categorySlug}?page=${page}`}
                    className="pagination-link active"
                  >
                    {page}
                  </Link>
                )}

                {/* Ellipsis before last page */}
                {page < totalPages - 1 && (
                  <span className="pagination-ellipsis">…</span>
                )}

                {/* Last Page */}
                {totalPages > 1 && (
                  <Link
                    href={`/${categorySlug}?page=${totalPages}`}
                    className={`pagination-link ${page === totalPages ? "active" : ""}`}
                  >
                    {totalPages}
                  </Link>
                )}

                {page < totalPages && (
                  <Link
                    href={`/${categorySlug}?page=${page + 1}`}
                    className="pagination-link"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-600 text-center">
            No posts available in this category.
          </p>
        )}
      </div>
    </>
  );
}

export async function generateStaticParams() {
  try {
    const res = await axios.get(`${apiUrl}/api/categories?limit=1000&depth=2`);
    const data = await res.data;

    const params: { categorySlug: string; page?: string }[] = [];
    const categories: Category[] = data.docs.filter(
      (category: Category) => !category.parent
    );

    for (const category of categories) {
      // Fetch total number of posts to calculate total pages
      const { total } = await fetchPostsByCategory(category.id, 1, 10);
      const totalPages = Math.ceil(total / 10); // Assuming limit=10
      const maxPagesToPreRender = Math.min(totalPages, 5); // Pre-render up to 5 pages

      // Generate params for the first page (no ?page query)
      params.push({ categorySlug: category.slug });

      // Generate params for additional pages (e.g., ?page=2, ?page=3)
      for (let page = 2; page <= maxPagesToPreRender; page++) {
        params.push({ categorySlug: category.slug, page: page.toString() });
      }
    }

    return params;
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}