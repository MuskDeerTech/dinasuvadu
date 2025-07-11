// components/Seo.tsx
type SeoProps = {
  title?: string; // Custom title if provided
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  pageType?: "category" | "post" | "tag" | "author" | "default" | "search"; // Added 'search' to pageType
  categoryTitle?: string; // For category pages
  postTitle?: string; // For post pages
  tagTitle?: string; // For tag pages
  authorName?: string; // For author pages
  searchQuery?: string; // New prop for search query
  pathname?: string; // Add pathname as a prop
};

export default function Seo({
  title,
  description = "Tamil News, Breaking News ,தமிழ் செய்திகள்",
  keywords = "Tamil news, breaking news, Dinasuvadu, latest updates, Tamil Nadu news",
  image = "https://dev.dinasuvadu.com/images/og-image.jpg",
  type = "website",
  pageType = "default",
  categoryTitle,
  postTitle,
  tagTitle,
  authorName,
  searchQuery, // New prop to handle search query
  pathname, // Use pathname prop
}: SeoProps) {
  // Dynamically generate title based on pageType and provided titles
  let dynamicTitle =
    title || "Dinasuvadu - Tamil News, Breaking News ,தமிழ் செய்திகள்";
  switch (pageType) {
    case "category":
      dynamicTitle = `${categoryTitle || "Category"} - Dinasuvadu`;
      break;
    case "post":
      dynamicTitle = `${postTitle || "Post"} - Dinasuvadu`;
      break;
    case "tag":
      dynamicTitle = `${tagTitle || "Tag"} - Dinasuvadu`;
      break;
    case "author":
      dynamicTitle = `${authorName || "Author"} - Dinasuvadu`;
      break;
    case "search":
      dynamicTitle = `${searchQuery || "Search"} - Dinasuvadu`; // Handle search case
      break;
    default:
      dynamicTitle = "Dinasuvadu - Tamil News, Breaking News ,தமிழ் செய்திகள்";
  }

  // Define the font URL for preloading
  const fontUrl =
    "https://fonts.gstatic.com/s/muktamalar/v14/MCoRzAXyz8LOE2FpJMxZqI2tKX7pHg.ttf";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dev.dinasuvadu.com";

  return (
    <>
      <title>{dynamicTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link
        rel="canonical"
        href={`${baseUrl}${pathname || ""}`}
      />
      <meta property="og:title" content={dynamicTitle} />
      <meta property="og:description" content={description} />
      <meta
        property="og:url"
        content={`${baseUrl}${pathname || ""}`}
      />
      <meta property="og:site_name" content="Dinasuvadu" />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="ta_IN" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={dynamicTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Mukta+Malar:wght@200;300;400;500;600;700;800&display=swap"
        media="all" // Remove onLoad and set media to "all" by default
      />
      <link rel="preload" href={fontUrl} as="font" type="font/ttf" crossOrigin="anonymous" /> 
    </>
  );
}