// export const dynamic = 'force-static';
import Link from "next/link";
import Text from "antd/es/typography/Text";
import "antd/dist/reset.css"; // Import Ant Design CSS
import { notFound } from "next/navigation";
import ShareButton from "../../../components/ShareButton";
import Seo from "../../../components/Seo";

// Type definitions
type RichTextChildBase = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  detail?: number;
  format?: number;
  mode?: string;
  style?: string;
  type?: "text";
  version?: number;
};

type AutolinkChild = {
  type: "autolink";
  children: RichTextChildBase[];
  fields: {
    linkType: "custom";
    url: string;
  };
  direction?: string;
  format?: string;
  indent?: number;
  version?: number;
};

type RichTextChild = RichTextChildBase | AutolinkChild;

type ParagraphBlock = {
  type: "paragraph";
  children: RichTextChild[];
  direction?: string;
  format?: string;
  indent?: number;
  version?: number;
  textFormat?: number;
  textStyle?: string;
};

type EmbedBlock = {
  type: "block";
  fields: {
    blockType: "embed";
    url: string;
    id?: string;
    blockName?: string;
  };
  version?: number;
  format?: string;
};

type VideoBlock = {
  type: "block";
  fields: {
    blockType: "video";
    url: string;
    id?: string;
    blockName?: string;
  };
  version?: number;
  format?: string;
};

type RichTextBlock = ParagraphBlock | EmbedBlock | VideoBlock;

type MediaBlock = {
  blockType: "mediaBlock";
  media: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    caption?: string;
  };
};

type ContentBlock = {
  blockType: "content";
  content: string;
};

type VideoLayoutBlock = {
  blockType: "video";
  media: {
    url: string;
    alt?: string;
    caption?: string;
  };
};

type EmbedLayoutBlock = {
  type: "block";
  blockType: "embed" | "video";
  version: number;
  format: string;
  fields: {
    id: string;
    url: string;
    blockName: string;
  };
};

type LayoutBlock = MediaBlock | ContentBlock | VideoLayoutBlock | EmbedLayoutBlock;

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
  layout?: LayoutBlock[];
  hero?: {
    type: string;
    richText?: RichTextBlock[];
    links?: any[];
  };
  heroImage?: {
    url: string;
    alt?: string;
    caption?: string;
  };
  content?: {
    root: {
      children: RichTextBlock[];
    };
  };
  meta?: {
    description?: string;
    image?: {
      url: string;
      alt?: string;
    };
  };
  categories?: Category[];
  populatedAuthors?: Author[];
  tags?: Tag[];
};

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Define the clamping style for text overflow
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

// Helper function to generate embed HTML from a URL
function generateEmbedHtml(url: string): string | null {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?.*)?$/;
  const match = url.match(youtubeRegex);
  if (match) {
    const videoId = match[4];
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
  return null;
}

// Utility function to extract plain text and embed HTML from richText content
function extractPlainTextFromRichText(content: Post["content"]): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .map((block): string => {
      if (block.type === "paragraph" && Array.isArray(block.children)) {
        return block.children
          .map((child) => {
            if ("text" in child) {
              return (child as RichTextChildBase).text;
            } else if (child.type === "autolink") {
              return (child as AutolinkChild).children
                .map((nestedChild) => nestedChild.text)
                .join("");
            }
            return "";
          })
          .join("");
      } else if (block.type === "block" && "fields" in block && block.fields?.url) {
        return block.fields.url;
      }
      return "";
    })
    .join("\n");
}

// Fetch functions using fetch with caching
async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const res = await fetch(`${apiUrl}/api/categories?where[slug][equals]=${slug}&depth=2`, {
    next: { revalidate: 900, tags: ['categories'] },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function fetchParentCategory(parentId: string): Promise<{ slug: string; title: string } | null> {
  const res = await fetch(`${apiUrl}/api/categories/${parentId}?depth=1`, {
    next: { revalidate: 900, tags: ['categories'] },
  });
  const data = await res.json();
  return data
    ? {
        slug: data.slug || "uncategorized",
        title: data.title || "Uncategorized",
      }
    : null;
}

async function fetchPost(slug: string): Promise<Post | null> {
  const res = await fetch(`${apiUrl}/api/posts?where[slug][equals]=${slug}&depth=3`, {
    next: { revalidate: 900, tags: ['posts'] },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function fetchPostsByCategory(categorySlug: string, page: number = 1, limit: number = 10): Promise<{ posts: Post[]; total: number }> {
  const res = await fetch(`${apiUrl}/api/categories?where[slug][equals]=${categorySlug}&depth=0`, {
    next: { revalidate: 900, tags: ['categories'] },
  });
  const categoryData = await res.json();
  const category = categoryData.docs?.[0] || null;
  if (!category) {
    return { posts: [], total: 0 };
  }
  const categoryId = category.id;
  const postsRes = await fetch(`${apiUrl}/api/posts?where[categories][in]=${categoryId}&sort=-publishedAt&depth=2&limit=${limit}&page=${page}`, {
    next: { revalidate: 900, tags: [`posts-${categoryId}`] },
  });
  const postsData = await postsRes.json();
  return {
    posts: postsData.docs || [],
    total: postsData.totalDocs || 0,
  };
}

async function fetchLatestPosts(currentPostSlug: string): Promise<Post[]> {
  const res = await fetch(`${apiUrl}/api/posts?limit=5&sort=-publishedAt&where[slug][not_equals]=${currentPostSlug}&depth=2`, {
    next: { revalidate: 900, tags: ['posts'] },
  });
  const data = await res.json();
  return data.docs || [];
}

async function fetchCategoryById(categoryId: string): Promise<{ title: string } | null> {
  const res = await fetch(`${apiUrl}/api/categories/${categoryId}?depth=1`, {
    next: { revalidate: 900, tags: ['categories'] },
  });
  const data = await res.json();
  return data
    ? {
        title: data.title || "Uncategorized",
      }
    : null;
}

export default async function PostOrSubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug, postSlug } = await params;
  const query = await searchParams;
  const page = parseInt(query.page || "1", 10);
  const limit = 10;

  const topLevelCategory = await fetchCategoryBySlug(categorySlug);
  if (!topLevelCategory) {
    notFound();
  }

  if (topLevelCategory.parent) {
    notFound();
  }

  let topLevelCategoryTitle = topLevelCategory.title || "Uncategorized";
  if (!topLevelCategory.title) {
    const fetchedCategory = await fetchCategoryById(topLevelCategory.id);
    if (fetchedCategory) {
      topLevelCategoryTitle = fetchedCategory.title;
    }
  }

  const possibleSubCategory = await fetchCategoryBySlug(postSlug);
  if (possibleSubCategory && possibleSubCategory.parent) {
    const parentCategory =
      typeof possibleSubCategory.parent === "string"
        ? await fetchParentCategory(possibleSubCategory.parent)
        : possibleSubCategory.parent;
    if (!parentCategory || parentCategory.slug !== categorySlug) {
      notFound();
    }

    let subCategoryTitle = possibleSubCategory.title || "Uncategorized";
    if (!possibleSubCategory.title) {
      const fetchedCategory = await fetchCategoryById(possibleSubCategory.id);
      if (fetchedCategory) {
        subCategoryTitle = fetchedCategory.title;
      }
    }

    const { posts, total } = await fetchPostsByCategory(postSlug, page, limit);
    const totalPages = Math.ceil(total / limit);



    return (
      <>
        <Seo pageType="category" categoryTitle={subCategoryTitle} />
        <div className="site">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 text-sm font-medium text-gray-500 site-main"
          >
            <div className="flex items-center space-x-2 breadcrumbs">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Home
              </Link>
              <span className="text-gray-400">{">"}</span>
              <Link
                href={`/${categorySlug}`}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {topLevelCategoryTitle}
              </Link>
              <span className="text-gray-400">{">"}</span>
              <span className="text-gray-700">{subCategoryTitle}</span>
            </div>
          </nav>

          {/* Subcategory Header */}
          <header className="mb-10 site-main">
            <h1 className="category-title">{subCategoryTitle}</h1>
          </header>

          {/* Posts Grid */}
          {posts.length > 0 ? (
            <>
              <div className="category-grid">
                {posts.map((post: Post) => {
                  const imageUrl = getImageUrl(post.heroImage?.url);
                  const imageAlt = post.heroImage?.alt || post.title;

                  return (
                    <article
                      key={post.id}
                      className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
                    >
                      <div className="post-item-category api-title bor-1">
                        <div className="flex-1 site-main">
                          <Link
                            href={`/${categorySlug}/${postSlug}/${post.slug}`}
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
                              url={`http://localhost:3001/${categorySlug}/${postSlug}/${post.slug}`}
                              title={post.title}
                              description={post.meta?.description}
                            />
                          </div>
                        </div>

                        {imageUrl ? (
                          <Link
                            href={`/${categorySlug}/${postSlug}/${post.slug}`}
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
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
                  {page > 1 && (
                    <Link
                      href={`/${categorySlug}/${postSlug}?page=${page - 1}`}
                      className="pagination-link"
                    >
                      Prev
                    </Link>
                  )}

                  {/* First Page */}
                  <Link
                    href={`/${categorySlug}/${postSlug}?page=1`}
                    className={`pagination-link ${page === 1 ? "active" : ""}`}
                  >
                    1
                  </Link>

                  {/* Ellipsis after first page */}
                  {page > 2 && <span className="pagination-ellipsis">…</span>}

                  {/* Current Page */}
                  {page !== 1 && page !== totalPages && (
                    <Link
                      href={`/${categorySlug}/${postSlug}?page=${page}`}
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
                      href={`/${categorySlug}/${postSlug}?page=${totalPages}`}
                      className={`pagination-link ${
                        page === totalPages ? "active" : ""
                      }`}
                    >
                      {totalPages}
                    </Link>
                  )}

                  {page < totalPages && (
                    <Link
                      href={`/${categorySlug}/${postSlug}?page=${page + 1}`}
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
              No posts available in this subcategory.
            </p>
          )}
        </div>
      </>
    );
  }

  const post = await fetchPost(postSlug);
  if (!post) {
    notFound();
  }

  let postCategory: Category | null = post.categories?.[0] || null;
  if (!postCategory) {
    postCategory = {
      id: "default",
      slug: "uncategorized",
      title: "Uncategorized",
    };
  }

  if (postCategory.slug !== categorySlug) {
    notFound();
  }

  const latestPosts = await fetchLatestPosts(postSlug);
  const parentCategoriesMap: { [key: string]: { slug: string; title: string } | null } = {};

  const parentIds = new Set<string>();
  latestPosts.forEach((latestPost) => {
    const latestCategory = latestPost.categories?.[0];
    if (latestCategory?.parent && typeof latestCategory.parent === "string") {
      parentIds.add(latestCategory.parent);
    }
  });

  await Promise.all(
    Array.from(parentIds).map(async (parentId) => {
      if (!parentCategoriesMap[parentId]) {
        parentCategoriesMap[parentId] = await fetchParentCategory(parentId);
      }
    })
  );

  // Extract plain text content if layout is not available
  const postContent = post.content
    ? extractPlainTextFromRichText(post.content)
    : "";


  return (
    <>
      <Seo
        pageType="post"
        postTitle={post.title}
        description={post.meta?.description}
      />
      <div className="site site-main">
        <div className="post-grid lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Article Content */}
          <article className="lg:col-span-2">
            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="mb-8 text-sm font-medium text-gray-500"
            >
              <div className="flex items-center space-x-2 breadcrumbs">
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Home
                </Link>
                <span className="text-gray-400">{">"}</span>
                <Link
                  href={`/${categorySlug}`}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {topLevelCategoryTitle}
                </Link>
              </div>
            </nav>

            {/* Post Title */}
            <h1 className="single-post-title">{post.title}</h1>

            {/* Meta Description */}
            {post.meta?.description && (
              <p className="post-summary-box">{post.meta.description}</p>
            )}

            <div className="entry-meta">
              {/* Meta Information */}
              <div
                className="flex flex-wrap items-center text-sm text-gray-600 mb-8 gap-2"
                style={{ marginBottom: "10px" }}
              >
                {post.populatedAuthors && post.populatedAuthors.length > 0 && (
                  <>
                    <span>By </span>
                    {post.populatedAuthors.map((author, i) => (
                      <span key={author.id}>
                        <Link
                          href={`/authors/${author.slug}`}
                          className="text-indigo-600 hover:underline transition-colors"
                        >
                          {author.name}
                        </Link>
                        {post.populatedAuthors &&
                          i < post.populatedAuthors.length - 1 &&
                          ", "}
                      </span>
                    ))}
                  </>
                )}
                {post.populatedAuthors &&
                  post.populatedAuthors.length > 0 &&
                  post.publishedAt && (
                    <span className="text-gray-400 mx-2" style={{ marginLeft: "5px" }}>
                      Posted on{" "}
                    </span>
                  )}
                {post.publishedAt && (
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Hero Image */}
            {(post.layout?.[0]?.blockType === "mediaBlock" &&
              post.layout[0].media) ||
            post.heroImage ? (
              <figure className="mb-12">
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  {post.layout?.[0]?.blockType === "mediaBlock" &&
                  post.layout[0].media ? (
                    <img
                      src={getImageUrl(post.layout[0].media.url) || undefined}
                      alt={post.layout[0].media.alt || "Hero Image"}
                      className="w-full h-80 object-cover"
                    />
                  ) : (
                    <img
                      src={getImageUrl(post.heroImage?.url) || undefined}
                      alt={post.heroImage?.alt || "Hero Image"}
                      className="w-full h-80 object-cover"
                    />
                  )}
                  {(post.layout?.[0] &&
                    "media" in post.layout[0] &&
                    post.layout[0].blockType === "mediaBlock" &&
                    (post.layout[0].media?.caption || post.heroImage?.caption)) && (
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm p-4">
                      {post.layout[0].media?.caption || post.heroImage?.caption}
                    </figcaption>
                  )}
                </div>
              </figure>
            ) : null}

            {/* Hero Rich Text */}
            {Array.isArray(post.hero?.richText) &&
              post.hero.richText.length > 0 && (
                <section className="prose prose-lg prose-blue max-w-none mb-12 text-gray-800">
                  {post.hero!.richText
                    .filter((block): block is ParagraphBlock => block.type === "paragraph")
                    .map((block, index) => (
                      <p key={index} className="leading-relaxed">
                        {block.children.map((child: RichTextChild, i: number) => {
                          if ("text" in child) {
                            const textChild = child as RichTextChildBase;
                            return (
                              <span
                                key={i}
                                className={`${textChild.bold ? "font-semibold" : ""} ${
                                  textChild.italic ? "italic" : ""
                                }`}
                              >
                                {textChild.text}
                              </span>
                            );
                          } else if (child.type === "autolink") {
                            const autolinkChild = child as AutolinkChild;
                            return autolinkChild.children.map((nestedChild: RichTextChildBase, j: number) => (
                              <span
                                key={`${i}-${j}`}
                                className={`${nestedChild.bold ? "font-semibold" : ""} ${
                                  nestedChild.italic ? "italic" : ""
                                }`}
                              >
                                {nestedChild.text}
                              </span>
                            ));
                          }
                          return null;
                        })}
                      </p>
                    ))}
                </section>
              )}

            {/* Post Content (Fallback if layout is empty) */}
            {(!post.layout || post.layout.length === 0) && post.content?.root?.children?.length ? (
              post.content.root.children.map((block, index) => {
                if (block.type === "paragraph" && Array.isArray(block.children)) {
                  const paragraphText = block.children
                    .flatMap((child) =>
                      child.type === "autolink"
                        ? child.children.map((c) => c.text).join("")
                        : child.text || ""
                    )
                    .join("")
                    .trim();
                  if (paragraphText) {
                    return (
                      <section key={index} className="mb-12">
                        <div className="prose prose-lg prose-gray max-w-none text-gray-800 leading-relaxed">
                          {paragraphText.split("\n").map((para, i) => (
                            <p className="post-desc" key={i}>
                              {para}
                            </p>
                          ))}
                        </div>
                      </section>
                    );
                  }
                } else if (block.type === "block" && block.fields?.blockType === "embed") {
                  return (
                    <div key={index} className="mb-12" dangerouslySetInnerHTML={{ __html: block.fields.url }} />
                  );
                } else if (block.type === "block" && block.fields?.blockType === "video") {
                  const embedHtml = generateEmbedHtml(block.fields.url);
                  if (embedHtml) {
                    return (
                      <div key={index} className="mb-12" dangerouslySetInnerHTML={{ __html: embedHtml }} />
                    );
                  }
                }
                return null;
              })
            ) : null}

            {/* Tags */}
            {(post.tags?.length ?? 0) > 0 && (
              <div className="post-tags mt-8">
                <div className="tags flex flex-wrap gap-2">
                  {(post.tags ?? []).map((tag) => (
                    <Link key={tag.id} href={`/tags/${tag.slug}`}>
                      <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-4 py-1.5 text-sm font-medium hover:bg-blue-200 transition-colors">
                        {tag.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar: Latest Posts */}
          <aside className="lg:col-span-1 mt-12 lg:mt-0 latest-posts">
            <div className="sticky top-20 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="category-title">Latest Posts</h2>
              {latestPosts.length > 0 ? (
                <div
                  className="space-y-4"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  {latestPosts.map((latestPost) => {
                    const latestCategory = latestPost.categories?.[0];
                    let latestCategorySlug = latestCategory?.slug || "uncategorized";
                    let latestSubCategorySlug: string | null = null;

                    if (latestCategory?.parent) {
                      const parent =
                        typeof latestCategory.parent === "string"
                          ? parentCategoriesMap[latestCategory.parent]
                          : latestCategory.parent;
                      if (parent) {
                        latestSubCategorySlug = latestCategorySlug;
                        latestCategorySlug = parent.slug || "uncategorized";
                      }
                    }

                    const imageUrl = getImageUrl(
                      latestPost.heroImage?.url ||
                        latestPost.meta?.image?.url ||
                        latestPost.layout?.find(
                          (block): block is MediaBlock | VideoLayoutBlock =>
                            (block.blockType === "mediaBlock" || block.blockType === "video") &&
                            "media" in block
                        )?.media?.url
                    );
                    const imageAlt =
                      latestPost.heroImage?.alt ||
                      latestPost.meta?.image?.alt ||
                      latestPost.layout?.find(
                        (block): block is MediaBlock | VideoLayoutBlock =>
                          (block.blockType === "mediaBlock" || block.blockType === "video") &&
                          "media" in block
                      )?.media?.alt ||
                      "Post Image";

                    return (
                      <Link
                        key={latestPost.id}
                        href={
                          latestSubCategorySlug
                            ? `/${latestCategorySlug}/${latestSubCategorySlug}/${latestPost.slug}`
                            : `/${latestCategorySlug}/${latestPost.slug}`
                        }
                        className="group block border-b border-gray-200 pb-4 last:border-b-0"
                      >
                        <div className="latest-post-rt">
                          <div style={{ flex: 1 }}>
                            <div
                              className="para-txt"
                              style={{
                                ...clampStyle,
                                fontSize: "13px",
                                fontWeight: "500",
                                WebkitBoxOrient: "vertical" as const,
                              }}
                            >
                              {latestPost.title}
                            </div>
                          </div>
                          {imageUrl ? (
                            <img
                              alt={imageAlt}
                              src={imageUrl}
                              style={{
                                width: "120px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "4px",
                                marginLeft: "12px",
                              }}
                            />
                          ) : (
                            <div>
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                No Image
                              </Text>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600">No recent posts available.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export async function generateStaticParams() {
  const params: { categorySlug: string; postSlug: string; id?: string }[] = [];
  try {
    const categoryRes = await fetch(`${apiUrl}/api/categories?limit=1000&depth=2`, {
      next: { revalidate: 900, tags: ['categories'] },
    });
    const categories: Category[] = (await categoryRes.json()).docs || [];
    for (const category of categories) {
      if (category.slug) {
        params.push({ categorySlug: category.slug, postSlug: category.slug });
        if (category.parent) {
          const parent = typeof category.parent === "string"
            ? await fetchParentCategory(category.parent)
            : category.parent;
          if (parent && parent.slug) {
            params.push({ categorySlug: parent.slug, postSlug: category.slug });
          }
        }
      }
    }
    const postRes = await fetch(`${apiUrl}/api/posts?limit=1000&depth=3`, {
      next: { revalidate: 900, tags: ['posts'] },
    });
    const posts: Post[] = (await postRes.json()).docs || [];
    for (const post of posts) {
      const category = post.categories?.[0];
      if (category) {
        let categorySlug = category.slug || "uncategorized";
        if (category.parent) {
          const parent = typeof category.parent === "string"
            ? await fetchParentCategory(category.parent)
            : category.parent;
          if (parent && parent.slug) categorySlug = parent.slug;
        }
        params.push({
          categorySlug,
          postSlug: post.slug,
          id: post.id,
        });
      }
    }
    return params;
  } catch (error) {
    return [];
  }
}