import axios from "axios";
import Link from "next/link";
import { Space } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import "antd/dist/reset.css"; // Import Ant Design CSS
import ShareButton from "@/components/ShareButton";

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

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${apiUrl}${url}`;
}

async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await axios.get(`${apiUrl}/api/tags?depth=1`);
    const tags = res.data.docs || [];
    console.log("Fetched tags:", tags);
    return tags;
  } catch (err) {
    console.error("Error fetching tags:", err.response?.data || err.message);
    return [];
  }
}

async function fetchTagBySlug(slug: string): Promise<Tag | null> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/tags?where[slug][equals]=${slug}&depth=1`
    );
    const tag = res.data.docs[0] || null;
    if (!tag) {
      console.log(`No tag found for slug: ${slug}`);
    }
    return tag;
  } catch (err) {
    console.error(
      `Error fetching tag with slug ${slug}:`,
      err.response?.data || err.message
    );
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
      `${apiUrl}/api/posts?limit=${limit}&page=${page}&depth=3&where[tags][contains]=${tagId}`
    );
    console.log(
      `Fetched ${res.data.docs.length} posts for tag ID ${tagId}, page: ${page}, limit: ${limit}`
    );
    return {
      posts: res.data.docs || [],
      total: res.data.totalDocs || 0,
    };
  } catch (err) {
    console.error(
      `Error fetching posts for tag ID ${tagId}:`,
      err.response?.data || err.message
    );
    return { posts: [], total: 0 };
  }
}

async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories/${parentId}?depth=1`);
    const parentCategory = res.data || null;
    if (!parentCategory) {
      console.log(`No parent category found for ID: ${parentId}`);
      return null;
    }
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    console.error(
      `Error fetching parent category with ID ${parentId}:`,
      err.response?.data || err.message
    );
    return null;
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { tagSlug: string };
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 10;

  const tag = await fetchTagBySlug(params.tagSlug);

  if (!tag) {
    return <div className="site">Tag not found</div>;
  }

  const { posts, total } = await fetchPostsByTag(tag.id, page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site">
      <div className="site-main">
        <h1 className="category-title ">Tag: {tag.title}</h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts found for this tag.</p>
      ) : (
        <>
          <div className="category-grid">
            {await Promise.all(
              posts.map(async (post) => {
                const mediaBlock = post.layout?.find(
                  (block) => block.blockType === "mediaBlock"
                );
                const imageUrl = getImageUrl(post.heroImage?.url);
              const imageAlt = post.heroImage?.alt || post.title;

                const category = post.categories?.[0];
                const categorySlug = category?.slug || "uncategorized";
                const categoryTitle = category?.title || "Uncategorized";

                let postUrl = `/${categorySlug}/${post.slug}`; // Default for top-level category
                if (category?.parent) {
                  const parent =
                    typeof category.parent === "string"
                      ? await fetchParentCategory(category.parent)
                      : category.parent;
                  if (parent) {
                    postUrl = `/${parent.slug}/${categorySlug}/${post.slug}`; // For subcategory
                  }
                }

                return (
                  <Link
                    key={post.id}
                    href={postUrl}
                    className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                  >
                    <article className="flex flex-col h-full">
                      <div className="post-item-category api-title">
                        <div className="flex-1 site-main">
                          <h3 className="post-title-1">{post.title}</h3>
                          {post.meta?.description && (
                            <p className="post-description">
                              {post.meta.description}
                            </p>
                          )}
                          <div className="post-first-tag">
                             {post.tags?.length > 0 && (
                              <Link href={`/tags/${post.tags[0].slug}`}>
                                <span className="text-blue-600 hover:underline">
                                  {post.tags[0].name}
                                </span>
                              </Link>
                            )}
                            <span style={{ marginTop: "4px" }}>
                              <Space size={4}>
                                <ClockCircleOutlined
                                  style={{ fontSize: "12px", color: "#8c8c8c" }}
                                />
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  5 Min Read
                                </Text>
                              </Space>
                            </span>
                            {/* Use the ShareButton Client Component */}
                            <ShareButton
                              url={`http://localhost:3001/${postUrl}`}
                              title={post.title}
                              description={post.meta?.description}
                            />
                          </div>
                        </div>
                        {/* Image */}
                        {imageUrl ? (
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg site-main">
                            <img
                              src={imageUrl}
                              alt={imageAlt}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                            <span className="text-gray-400 text-sm">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  </Link>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
              {page > 1 && (
                <Link
                  href={`/tags/${params.tagSlug}?page=${page - 1}`}
                  className="pagination-link"
                >
                  Prev
                </Link>
              )}

              {/* First Page */}
              <Link
                href={`/tags/${params.tagSlug}?page=1`}
                className={`pagination-link ${page === 1 ? "active" : ""}`}
              >
                1
              </Link>

              {/* Ellipsis after first page if current page is greater than 2 */}
              {page > 2 && <span className="pagination-ellipsis">…</span>}

              {/* Current Page (only if it's not the first or last page) */}
              {page !== 1 && page !== totalPages && (
                <Link
                  href={`/tags/${params.tagSlug}?page=${page}`}
                  className="pagination-link active"
                >
                  {page}
                </Link>
              )}

              {/* Ellipsis before last page if current page is less than totalPages - 1 */}
              {page < totalPages - 1 && (
                <span className="pagination-ellipsis">…</span>
              )}

              {/* Last Page (only if totalPages > 1) */}
              {totalPages > 1 && (
                <Link
                  href={`/tags/${params.tagSlug}?page=${totalPages}`}
                  className={`pagination-link ${
                    page === totalPages ? "active" : ""
                  }`}
                >
                  {totalPages}
                </Link>
              )}

              {page < totalPages && (
                <Link
                  href={`/tags/${params.tagSlug}?page=${page + 1}`}
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
  );
}

export async function generateStaticParams() {
  const tags = await fetchTags();
  const validTags = tags.filter((tag: Tag) => {
    if (!tag.slug || typeof tag.slug !== "string") {
      console.warn(`Skipping tag with invalid slug:`, tag);
      return false;
    }
    return true;
  });

  return validTags.map((tag: Tag) => ({
    tagSlug: tag.slug,
  }));
}
