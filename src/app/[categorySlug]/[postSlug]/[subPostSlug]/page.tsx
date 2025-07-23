export const revalidate = 10; // Revalidate every 10 seconds
import axios from "axios";
import Link from "next/link";
import Text from "antd/es/typography/Text";
import { notFound } from "next/navigation";
import Seo from "../../../../components/Seo";
import TwitterEmbedClient from "./TwitterEmbedClient"; // Import the Client Component

// Type definitions (unchanged)
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

type RichTextBlock = ParagraphBlock | EmbedBlock | VideoBlock;

type Media = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
  [key: string]: any;
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
  [key: string]: any;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: Media;
  content?: {
    root: {
      children: RichTextBlock[];
    };
  };
  meta?: {
    description?: string;
    image?: Media;
  };
  categories?: Category[];
  populatedAuthors?: Author[];
  tags?: Tag[];
  [key: string]: any;
};

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

// Fetch parent category details by ID
async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories/${parentId}?depth=1`);
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

// Fetch a single post by slug
async function fetchPost(slug: string): Promise<Post | null> {
  try {
    const response = await axios.get(
      `${apiUrl}/api/posts?where[slug][equals]=${slug}&depth=2`
    );
    return response.data.docs[0] || null;
  } catch (error) {
    return null;
  }
}

// Fetch the latest posts (excluding the current post)
async function fetchLatestPosts(currentPostSlug: string): Promise<Post[]> {
  try {
    const response = await axios.get(
      `${apiUrl}/api/posts?limit=5&sort=-publishedAt&where[slug][not_equals]=${currentPostSlug}&depth=2`
    );
    return response.data.docs || [];
  } catch (error) {
    return [];
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
    return res.data
      ? {
          title: res.data.title || "Uncategorized",
        }
      : null;
  } catch (err) {
    return null;
  }
}

// Define the clamping style for text overflow
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Utility function to extract plain text from richText content
function extractPlainTextFromRichText(content: Post["content"]): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .filter((block): block is ParagraphBlock => block.type === "paragraph")
    .map((block) =>
      block.children
        .flatMap((child) =>
          child.type === "autolink"
            ? child.children.map((c) => c.text).join("")
            : child.text || ""
        )
        .join("")
    )
    .join("\n");
}

export default async function SubCategoryPostPage({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
    subPostSlug: string;
  }>;
}) {
  const { categorySlug, postSlug, subPostSlug } = await params;

  // Fetch the subcategory (postSlug should be a subcategory like "india")
  const subCategory = await fetchCategoryBySlug(postSlug);
  if (!subCategory) {
    notFound();
  }

  // Ensure the subcategory has a parent
  if (!subCategory.parent) {
    notFound();
  }

  // Fetch the parent category
  const parentCategory =
    typeof subCategory.parent === "string"
      ? await fetchParentCategory(subCategory.parent)
      : subCategory.parent;
  if (!parentCategory) {
    notFound();
  }

  // Verify the parent category matches categorySlug
  if (parentCategory.slug !== categorySlug) {
    notFound();
  }

  // Fetch subcategory title
  let subCategoryTitle = subCategory.title || "Uncategorized";
  if (!subCategory.title) {
    const fetchedCategory = await fetchCategoryById(subCategory.id);
    if (fetchedCategory) {
      subCategoryTitle = fetchedCategory.title;
    }
  }

  // Fetch the post (subPostSlug is the actual post slug)
  const post = await fetchPost(subPostSlug);
  if (!post) {
    notFound();
  }

  // Get the post's category with a fallback
  let postCategory: Category | null = post.categories?.[0] || null;
  if (!postCategory) {
    postCategory = {
      id: "default",
      slug: "uncategorized",
      title: "Uncategorized",
    };
  }

  // Verify the post's category matches the subcategory
  if (postCategory.slug !== postSlug) {
    notFound();
  }

  // Fetch latest posts for the sidebar
  const latestPosts = await fetchLatestPosts(subPostSlug);

  // Pre-fetch parent categories for latest posts
  const parentCategoriesMap: {
    [key: string]: { slug: string; title: string } | null;
  } = {};
  for (const latestPost of latestPosts) {
    const latestCategory = latestPost.categories?.[0];
    if (latestCategory?.parent && typeof latestCategory.parent === "string") {
      if (!parentCategoriesMap[latestCategory.parent]) {
        parentCategoriesMap[latestCategory.parent] = await fetchParentCategory(
          latestCategory.parent
        );
      }
    }
  }

  // Extract plain text content
  const postContent = extractPlainTextFromRichText(post.content);

  const keywords = post.tags?.map((tag) => tag.name).join(", ") || "";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.dinasuvadu.com";
  const postUrl = `${baseUrl}/${categorySlug}/${postSlug}/${subPostSlug}`;
  const imageUrl = getImageUrl(post.heroImage?.url) || `${baseUrl}/images/og-image.jpg`;

  // Render the page
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: post.title,
            image: [imageUrl],
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            author: post.populatedAuthors?.map((author) => ({
              "@type": "Person",
              name: author.name,
            })),
            publisher: {
              "@type": "Organization",
              name: "Dinasuvadu",
              logo: {
                "@type": "ImageObject",
                url: `${baseUrl}/images/logo.png`,
              },
            },
            url: postUrl,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": postUrl,
            },
            description: post.meta?.description || postContent.substring(0, 160),
            keywords: keywords,
          }),
        }}
      />
      <Seo
        pathname={`/${categorySlug}/${postSlug}/${subPostSlug}`}
        pageType="post"
        postTitle={post.title}
        keywords={keywords}
      />
      <div className="site site-main">
        <div className="post-grid lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Article Content */}
          <article className="lg:col-span-2">
            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="mb-6 text-sm font-medium text-gray-600"
            >
              <div className="flex items-center space-x-2 breadcrumbs">
                <Link
                  href="/"
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  Home
                </Link>
                <span className="text-gray-400">{">"}</span>
                <Link
                  href={`/${categorySlug}`}
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  {parentCategory.title}
                </Link>
                <span className="text-gray-400">{">"}</span>
                <Link
                  href={`/${categorySlug}/${postSlug}`}
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  {subCategoryTitle}
                </Link>
              </div>
            </nav>

            {/* Post Title */}
            <h1 className="single-post-title">{post.title}</h1>

            {/* Meta Description */}
            {post.meta?.description && (
              <p className="post-summary-box">{post.meta.description}</p>
            )}

            {/* Meta Information */}
            <div className="entry-meta">
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
                    <span
                      className="text-gray-400 mx-2"
                      style={{ marginLeft: "5px" }}
                    >
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
            {post.heroImage && (
              <figure className="mb-10">
                <div className="relative">
                  {(() => {
                    const imageUrl = getImageUrl(post.heroImage.url);
                    const imageAlt = post.heroImage.alt || "Hero Image";
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={imageAlt}
                        className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="w-full h-64 sm:h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Text type="secondary">No Image</Text>
                      </div>
                    );
                  })()}
                  {post.heroImage.caption && (
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-sm p-4 rounded-b-lg">
                      {post.heroImage.caption}
                    </figcaption>
                  )}
                </div>
              </figure>
            )}

            {/* Post Content (Plain Text and Embeds) */}
            {post.content?.root?.children.map((block, index) => {
              if (block.type === "paragraph") {
                return (
                  <section className="mb-12" key={index}>
                    <div className="prose prose-lg prose-gray max-w-none text-gray-800 leading-relaxed">
                      <p className="post-desc" key={index}>
                      {block.children.map((child: RichTextChild, j: number) => {
                        if ("text" in child) {
                          const textChild = child as RichTextChildBase;
                          const isBold = textChild.format === 1; // Interpret format 1 as bold
                          return (
                            <span
                              key={`${index}-${j}`}
                              className={`${isBold ? "font-semibold" : ""}`}
                            >
                              {textChild.text}
                            </span>
                          );
                        } else if (child.type === "autolink") {
                          const autolinkChild = child as AutolinkChild;
                          return autolinkChild.children.map(
                            (nestedChild: RichTextChildBase, k: number) => {
                              const isBold = nestedChild.format === 1; // Interpret format 1 as bold
                              return (
                                <span
                                  key={`${index}-${j}-${k}`}
                                  className={`${isBold ? "font-semibold" : ""}`}
                                >
                                  {nestedChild.text}
                                </span>
                              );
                            }
                          );
                        }
                        return null;
                      })}
                      </p>
                    </div>
                  </section>
                );
              } else if (block.type === "block" && block.fields?.blockType === "embed") {
                // Check if the URL contains Twitter embed HTML
                if (block.fields.url.includes("<blockquote class=\"twitter-tweet\"")) {
                  return <TwitterEmbedClient key={index} html={block.fields.url} />;
                }
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
            })}

            {/* Tags */}
            {(post.tags ?? []).length > 0 && (
              <div className="post-tags mt-8">
                <div className="tags flex flex-wrap gap-2">
                  {(post.tags ?? []).map((tag) => (
                    <Link key={tag.id} href={`/tags/${tag.slug}`}>
                      <span className="inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
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
            <div className="sticky top-20 bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
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
                    let latestCategorySlug =
                      latestCategory?.slug || "uncategorized";
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
                      latestPost.heroImage?.url || latestPost.meta?.image?.url
                    );
                    const imageAlt =
                      latestPost.heroImage?.alt ||
                      latestPost.meta?.image?.alt ||
                      "Post Image";

                    return (
                      <Link
                        key={latestPost.id}
                        href={
                          latestSubCategorySlug
                            ? `/${latestCategorySlug}/${latestSubCategorySlug}/${latestPost.slug}`
                            : `/${latestCategorySlug}/${latestPost.slug}`
                        }
                        className="block p-4 bg-white border border-gray-200 rounded-md hover:shadow-md hover:bg-gray-100 transition-all"
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

// Generate static parameters for Next.js static generation
export async function generateStaticParams() {
  try {
    const res = await axios.get(`${apiUrl}/api/posts?limit=1000&depth=2`);
    const data = await res.data;

    const params = [];
    for (const post of data.docs) {
      const category = post.categories?.[0];
      if (category?.parent) {
        const parent =
          typeof category.parent === "string"
            ? await fetchParentCategory(category.parent)
            : category.parent;
        if (parent) {
          const parentCategorySlug = parent.slug || "uncategorized";
          const subCategorySlug = category.slug || "uncategorized";
          params.push({
            categorySlug: parentCategorySlug,
            postSlug: subCategorySlug,
            subPostSlug: post.slug,
          });
        }
      }
    }

    return params;
  } catch (error) {
    return [];
  }
}