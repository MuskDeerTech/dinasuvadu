export const dynamic = 'force-static' ;
export const revalidate = 60;
import axios from "axios";
import Link from "next/link";
import "antd/dist/reset.css"; // Import Ant Design CSS
import ShareButton from "../../../components/ShareButton";
import Seo from "../../../components/Seo";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  slug: string;
  title?: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  meta?: {
    description?: string;
  };
  tags?: Tag[];
  layout?: {
    blockType: string;
    media?: {
      url: string;
      alt?: string;
    };
  }[];
  categories?: Category[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// Helper function to handle query parameters (string | string[] | undefined)
const getPageNumber = (pageParam: string | string[] | undefined): number => {
  if (Array.isArray(pageParam)) {
    return parseInt(pageParam[0] || "1", 10); // Take the first value if it's an array
  }
  return parseInt(pageParam || "1", 10);
};

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await axios.get(`${apiUrl}/api/tags?depth=1`, {
      timeout: 10000,
    });
    return res.data.docs || [];
  } catch (err) {
    return [];
  }
}

async function fetchTagBySlug(slug: string): Promise<Tag | null> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/tags?where[slug][equals]=${slug}&depth=1`,
      { timeout: 10000 }
    );
    return res.data.docs[0] || null;
  } catch (err) {
    return null;
  }
}

async function fetchPostsByTag(
  tagId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/posts?limit=${limit}&page=${page}&depth=3&where[tags][contains]=${tagId}`,
      { timeout: 10000 }
    );
    return {
      posts: res.data.docs || [],
      total: res.data.totalDocs || 0,
    };
  } catch (err) {
    return { posts: [], total: 0 };
  }
}

async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/categories/${parentId}?depth=1`,
      {
        timeout: 10000,
      }
    );
    return res.data
      ? {
          slug: res.data.slug || "uncategorized",
          title: res.data.title || "Uncategorized",
        }
      : null;
  } catch (err) {
    return null;
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tagSlug } = await params;
  const query = await searchParams;
  const page = getPageNumber(query.page);
  const limit = 10;

  const tag = await fetchTagBySlug(tagSlug);

  if (!tag) {
    return <div className="site">Tag not found</div>;
  }

  const { posts, total } = await fetchPostsByTag(tag.id, page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Seo
        pathname={`/tags/${tagSlug}${page > 1 ? `?page=${page}` : ""}`}
        pageType="tag"
        tagTitle={tag.name}
      />
      <div className="site">
        <div className="site-main">
          <h1 className="category-title">Tag: {tag.name}</h1>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-500">No posts found for this tag.</p>
        ) : (
          <>
            <div className="category-grid">
              {await Promise.all(
                posts.map(async (post) => {
                  const imageUrl = getImageUrl(post.heroImage?.url);
                  const imageAlt = post.heroImage?.alt || post.title;

                  const category = post.categories?.[0];
                  const categorySlug = category?.slug || "uncategorized";

                  let postUrl = `/${categorySlug}/${post.slug}`;
                  if (category?.parent) {
                    const parent =
                      typeof category.parent === "string"
                        ? await fetchParentCategory(category.parent)
                        : category.parent;
                    if (parent) {
                      postUrl = `/${parent.slug}/${categorySlug}/${post.slug}`;
                    }
                  }

                  return (
                    <article
                      key={post.id}
                      className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                    >
                      <div className="post-item-category api-title bor-1">
                        <div className="flex-1 site-main">
                          <Link href={postUrl} className="flex flex-col h-full">
                            <h3 className="post-title-1">{post.title}</h3>
                            {post.meta?.description && (
                              <p className="post-description">
                                {post.meta.description}
                              </p>
                            )}
                          </Link>
                          <div className="post-first-tag">
                            {(post.tags ?? []).length > 0 && (
                              <Link href={`/tags/${post.tags![0].slug}`}>
                                <span className="text-blue-600 hover:underline">
                                  {post.tags![0].name}
                                </span>
                              </Link>
                            )}
                            <ShareButton
                              url={`${baseUrl}${postUrl}`}
                              title={post.title}
                              description={post.meta?.description}
                            />
                          </div>
                        </div>
                        {imageUrl ? (
                          <Link
                            href={postUrl}
                            className="relative w-full h-48 overflow-hidden rounded-t-lg site-main"
                          >
                            <img
                              src={imageUrl}
                              alt={imageAlt}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </Link>
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                            <span className="text-gray-400 text-sm">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
                {page > 1 && (
                  <Link
                    href={`/tags/${tagSlug}?page=${page - 1}`}
                    className="pagination-link"
                  >
                    Prev
                  </Link>
                )}

                <Link
                  href={`/tags/${tagSlug}?page=1`}
                  className={`pagination-link ${page === 1 ? "active" : ""}`}
                >
                  1
                </Link>

                {page > 2 && <span className="pagination-ellipsis">…</span>}

                {page !== 1 && page !== totalPages && (
                  <Link
                    href={`/tags/${tagSlug}?page=${page}`}
                    className="pagination-link active"
                  >
                    {page}
                  </Link>
                )}

                {page < totalPages - 1 && (
                  <span className="pagination-ellipsis">…</span>
                )}

                {totalPages > 1 && (
                  <Link
                    href={`/tags/${tagSlug}?page=${totalPages}`}
                    className={`pagination-link ${
                      page === totalPages ? "active" : ""
                    }`}
                  >
                    {totalPages}
                  </Link>
                )}

                {page < totalPages && (
                  <Link
                    href={`/tags/${tagSlug}?page=${page + 1}`}
                    className="pagination-link"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export async function generateStaticParams() {
  const tags = await fetchTags();
  const validTags = tags.filter((tag: Tag) => {
    return tag.slug && typeof tag.slug === "string";
  });

  return validTags.map((tag: Tag) => ({
    tagSlug: tag.slug,
  }));
}