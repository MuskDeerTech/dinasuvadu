
export const dynamic = "force-static"; // Force static generation where possible
export const revalidate = 60;
import axios from "axios";
import Link from "next/link";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import "antd/dist/reset.css"; // Import Ant Design CSS
import { notFound } from "next/navigation";
import ShareButton from "../../../components/ShareButton";
import Seo from "../../../components/Seo"

// Type definitions
type RichTextChild = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type RichTextBlock = {
  children: RichTextChild[];
};

type LayoutBlock = {
  blockType: string;
  media?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    caption?: string;
  };
  content?: string;
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
  layout?: LayoutBlock[];
  hero?: {
    type: string;
    richText?: RichTextBlock[];
    links?: any[];
  };
  heroImage?: {
    url: string;
    alt?: string;
    caption?: string; // Added caption for consistency
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

// Utility function to extract plain text from richText content
function extractPlainTextFromRichText(content: Post["content"]): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .map((block) => block.children.map((child) => child.text).join(""))
    .join("\n");
}

// Fetch a category by slug
async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    console.log(`Fetching category with slug: ${slug}`);
    const response = await axios.get(
      `${apiUrl}/api/categories?where[slug][equals]=${slug}&depth=2`
    );
    const category = response.data.docs[0] || null;
    if (!category) {
      console.log(`No category found for slug: ${slug}`);
      return null;
    }
    console.log(`Fetched category ${slug}:`, JSON.stringify(category, null, 2));
    return category;
  } catch (error) {
    console.error(
      `Error fetching category with slug ${slug}:`,
      (error as any).response?.data || (error as any).message
    );
    return null;
  }
}

// Fetch parent category details by ID
async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    console.log(`Fetching parent category with ID: ${parentId}`);
    const res = await axios.get(`${apiUrl}/api/categories/${parentId}?depth=1`);
    const parentCategory = res.data || null;
    if (!parentCategory) {
      console.log(`No parent category found for ID: ${parentId}`);
      return null;
    }
    console.log(
      `Fetched parent category:`,
      JSON.stringify(parentCategory, null, 2)
    );
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    console.error(
      `Error fetching parent category with ID ${parentId}:`,
      (err as any).response?.data || (err as any).message
    );
    return null;
  }
}

// Fetch a single post by slug
async function fetchPost(slug: string): Promise<Post | null> {
  try {
    console.log(`Fetching post with slug: ${slug}`);
    const response = await axios.get(
      `${apiUrl}/api/posts?where[slug][equals]=${slug}&depth=3` // Increased depth to 3 to ensure tags are populated
    );
    console.log(
      `API response for post slug ${slug}:`,
      JSON.stringify(response.data, null, 2)
    );
    const post = response.data.docs[0] || null;
    if (!post) {
      console.log(`No post found for slug: ${slug}`);
    } else {
      console.log(`Found post: ${post.title} (slug: ${slug})`);
    }
    return post;
  } catch (error) {
    console.error(
      "Error fetching post with slug " + slug + ":",
      (error as any).response?.data || (error as any).message
    );
    return null;
  }
}

// Fetch posts by category slug (using category ID) with pagination
async function fetchPostsByCategory(
  categorySlug: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    console.log(`Fetching category ID for slug: ${categorySlug}`);
    const categoryResponse = await axios.get(
      `${apiUrl}/api/categories?where[slug][equals]=${categorySlug}&depth=0`
    );
    const category = categoryResponse.data.docs[0] || null;
    if (!category) {
      console.log(`Category not found for slug: ${categorySlug}`);
      return { posts: [], total: 0 };
    }
    const categoryId = category.id;
    console.log(`Category ID for ${categorySlug}: ${categoryId}`);

    console.log(
      `Fetching posts for category ID: ${categoryId}, page: ${page}, limit: ${limit}`
    );
    const response = await axios.get(
      `${apiUrl}/api/posts?where[categories][in]=${categoryId}&sort=-publishedAt&depth=2&limit=${limit}&page=${page}`
    );
    const posts = response.data.docs || [];
    const total = response.data.totalDocs || 0;
    console.log(
      `Fetched ${posts.length} posts for category ${categorySlug} (ID: ${categoryId}), total: ${total}`
    );
    return { posts, total };
  } catch (error) {
    console.error(
      "Error fetching posts for category " + categorySlug + ":",
      (error as any).response?.data || (error as any).message
    );
    return { posts: [], total: 0 };
  }
}

// Fetch the latest posts (excluding the current post)
async function fetchLatestPosts(currentPostSlug: string): Promise<Post[]> {
  try {
    console.log(`Fetching latest posts excluding slug: ${currentPostSlug}`);
    const response = await axios.get(
      `${apiUrl}/api/posts?limit=5&sort=-publishedAt&where[slug][not_equals]=${currentPostSlug}&depth=2`
    );
    const posts = response.data.docs || [];
    console.log(`Fetched ${posts.length} latest posts`);
    return posts;
  } catch (error) {
    console.error(
      "Error fetching latest posts:",
      (error as any).response?.data || (error as any).message
    );
    return [];
  }
}

// Fetch category details by ID
async function fetchCategoryById(
  categoryId: string
): Promise<{ title: string } | null> {
  try {
    console.log(`Fetching category with ID: ${categoryId}`);
    const res = await axios.get(
      `${apiUrl}/api/categories/${categoryId}?depth=1`
    );
    const category = res.data || null;
    if (!category) {
      console.log(`No category found for ID: ${categoryId}`);
      return null;
    }
    console.log(`Fetched category by ID:`, JSON.stringify(category, null, 2));
    return {
      title: category.title || "Uncategorized",
    };
  } catch (err) {
    console.error(
      `Error fetching category with ID ${categoryId}:`,
      (err as any)?.response?.data || (err as any)?.message
    );
    return null;
  }
}

export default async function PostOrSubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
  searchParams: Promise<{ page?: string }>; // Updated type to Promise
}) {
  console.log(
    "Entering PostOrSubCategoryPage component for [categorySlug]/[postSlug]"
  );

  const { categorySlug, postSlug } = await params;
  const query = await searchParams; // Await the Promise to get the resolved value
  const page = parseInt(query.page || "1", 10); // Access the resolved value
  const limit = 10;
  console.log(`Handling route: /${categorySlug}/${postSlug}?page=${page}`);

  // Rest of your component code remains unchanged
  const topLevelCategory = await fetchCategoryBySlug(categorySlug);
  if (!topLevelCategory) {
    console.log(`Top-level category ${categorySlug} not found`);
    notFound();
  }

  if (topLevelCategory.parent) {
    console.log(
      `Category ${categorySlug} has a parent, this route is for top-level categories only.`
    );
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
      console.log(
        `Parent category for ${postSlug} does not match ${categorySlug}`
      );
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
   
     // Calculate the pathname based on the route and page query
   const pathname = `/${categorySlug}/${postSlug}${page > 1 ? `?page=${page}` : ""}`;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.dinasuvadu.com";


    return (
      <>
      
      <Seo
          pageType="category"
          categoryTitle={subCategoryTitle}
          pathname={pathname}
        />
         <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: subCategoryTitle,
            url: `${baseUrl}${pathname}`,
            description: `Explore the latest posts in ${subCategoryTitle} on Dinasuvadu.`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((post, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: post.title,
                url: `${baseUrl}/${categorySlug}/${postSlug}/${post.slug}`,
                image: getImageUrl(post.heroImage?.url) || `${baseUrl}/images/og-image.jpg`,
                description: post.meta?.description || extractPlainTextFromRichText(post.content),
              })),
            },
          }),
        }}
      />
      <div className="site ">
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
                          href={`/${categorySlug}/${postSlug}/${post.slug}`} className="relative w-full h-48 overflow-hidden rounded-t-lg site-main">
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

                {/* Ellipsis after first page if current page is greater than 2 */}
                {page > 2 && <span className="pagination-ellipsis">…</span>}

                {/* Current Page (only if it's not the first or last page) */}
                {page !== 1 && page !== totalPages && (
                  <Link
                    href={`/${categorySlug}/${postSlug}?page=${page}`}
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
    console.log(`Post not found for slug: ${postSlug}`);
    notFound();
  }

  let postCategory: Category | null = post.categories?.[0] || null;
  if (!postCategory) {
    console.log(`Post ${postSlug} has no associated category, using default`);
    postCategory = {
      id: "default",
      slug: "uncategorized",
      title: "Uncategorized",
    };
  }

  if (postCategory.slug !== categorySlug) {
    console.log(
      `Post category ${postCategory.slug} does not match URL category ${categorySlug}`
    );
    notFound();
  }

  const latestPosts = await fetchLatestPosts(postSlug);

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

   // Calculate the pathname based on the route and page query
   const pathname = `/${categorySlug}/${postSlug}${page > 1 ? `?page=${page}` : ""}`;
  // Extract plain text content if layout is not available
  const postContent = post.content
    ? extractPlainTextFromRichText(post.content)
    : "";
// Generate keywords from tags
  const keywords = post.tags?.map((tag) => tag.name).join(", ") || "";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.dinasuvadu.com";
  const postUrl = `${baseUrl}/${categorySlug}/${postSlug}`;
  const imageUrl = getImageUrl(post.heroImage?.url || post.layout?.[0]?.media?.url) || `${baseUrl}/images/og-image.jpg`;
  return (
    <>
    {post && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              headline: post.title,
              image: [imageUrl],
              datePublished: post.publishedAt,
              dateModified: post.publishedAt, // Update this if you track modifications
              author: post.populatedAuthors?.map((author) => ({
                "@type": "Person",
                name: author.name,
              })),
              publisher: {
                "@type": "Organization",
                name: "Dinasuvadu",
                logo: {
                  "@type": "ImageObject",
                  url: `${baseUrl}/images/logo.png`, // Update with your logo URL
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
      )}
    <Seo pageType="post" postTitle={post.title} pathname={pathname} keywords={keywords} />
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
          {(post.layout?.[0]?.blockType === "mediaBlock" &&
            post.layout[0].media) ||
          post.heroImage ? (
            <figure className="mb-12">
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                {post.layout?.[0]?.blockType === "mediaBlock" &&
                post.layout[0].media ? (
                  <img
                    src={getImageUrl(post.layout[0].media.url) || undefined} // Applied getImageUrl
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
                {(post.layout?.[0]?.media?.caption ||
                  post.heroImage?.caption) && (
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm p-4">
                    {post.layout?.[0]?.media?.caption ||
                      post.heroImage?.caption}
                  </figcaption>
                )}
              </div>
            </figure>
          ) : null}

          {/* Hero Rich Text */}
          {Array.isArray(post.hero?.richText) &&
            post.hero.richText.length > 0 && (
              <section className="prose prose-lg prose-blue max-w-none mb-12 text-gray-800">
                {post.hero!.richText!.map((block, index) => (
                  <p key={index} className="leading-relaxed">
                    {block.children.map((child, i) => (
                      <span
                        key={i}
                        className={`${child.bold ? "font-semibold" : ""} ${
                          child.italic ? "italic" : ""
                        }`}
                      >
                        {child.text}
                      </span>
                    ))}
                  </p>
                ))}
              </section>
            )}

          {/* Post Content */}
          {post.layout && post.layout.slice(1).length > 0 ? (
            post.layout.slice(1).map((block, index) => (
              <section key={index} className="mb-12">
                {block.blockType === "mediaBlock" && block.media && (
                  <figure className="my-8">
                    <img
                      src={getImageUrl(block.media.url) || undefined} // Applied getImageUrl
                      alt={block.media.alt || "Media"}
                      className="w-full max-w-2xl mx-auto h-auto object-cover rounded-md shadow-md"
                    />
                    {block.media.caption && (
                      <figcaption className="text-sm text-gray-600 mt-3 text-center">
                        {block.media.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {block.blockType === "content" && block.content && (
                  <div
                    className="prose prose-lg prose-blue max-w-none text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: block.content }}
                  />
                )}
              </section>
            ))
          ) : postContent ? (
            <section className="mb-12">
              <div className="prose prose-lg prose-blue max-w-none text-gray-800 leading-relaxed">
                {postContent.split("\n").map((paragraph, index) => (
                  <p className="post-desc" key={index}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

    

          {/* Tags */}
          {(post.tags ?? []).length > 0 && (
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
                    latestPost.heroImage?.url ||
                      latestPost.meta?.image?.url ||
                      latestPost.layout?.find(
                        (block) =>
                          block.blockType === "mediaBlock" && block.media?.url
                      )?.media?.url
                  );
                  const imageAlt =
                    latestPost.heroImage?.alt ||
                    latestPost.meta?.image?.alt ||
                    latestPost.layout?.find(
                      (block) =>
                        block.blockType === "mediaBlock" && block.media?.alt
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
                          {/* <div style={{ marginTop: "4px" }}>
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
                          </div> */}
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
  const params: { categorySlug: string; postSlug: string }[] = [];
  try {
    const categoryRes = await axios.get(`${apiUrl}/api/categories?limit=1000&depth=2`);
    const categories: Category[] = categoryRes.data.docs || [];
    for (const category of categories) {
      if (category.slug) {
        params.push({ categorySlug: category.slug, postSlug: category.slug }); // For category pages
        if (category.parent) {
          const parent = typeof category.parent === "string" ? await fetchParentCategory(category.parent) : category.parent;
          if (parent && parent.slug) {
            params.push({ categorySlug: parent.slug, postSlug: category.slug }); // For subcategories
          }
        }
      }
    }
    const postRes = await axios.get(`${apiUrl}/api/posts?limit=1000&depth=3`);
    const posts: Post[] = postRes.data.docs || [];
    for (const post of posts) {
      const category = post.categories?.[0];
      if (category) {
        let categorySlug = category.slug || "uncategorized";
        if (category.parent) {
          const parent = typeof category.parent === "string" ? await fetchParentCategory(category.parent) : category.parent;
          if (parent && parent.slug) categorySlug = parent.slug;
        }
        params.push({ categorySlug, postSlug: post.slug });
      }
    }
    console.log(`Total static params generated: ${params.length}`);
    return params;
  } catch (error) {
    console.error("Error generating static params:", (error as any).response?.data || (error as any).message);
    return [];
  }
}