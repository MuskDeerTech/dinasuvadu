// components/Seo.tsx
"use client";

import { usePathname } from "next/navigation";

type SeoProps = {
  title?: string; // Custom title if provided
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  pageType?: "category" | "post" | "tag" | "author" | "default"; // Add page type to determine title structure
  categoryTitle?: string; // For category pages
  postTitle?: string; // For post pages
  tagTitle?: string; // For tag pages
  authorName?: string; // For author pages
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
}: SeoProps) {
  const pathname = usePathname();

  // Dynamically generate title based on pageType and provided titles
  let dynamicTitle = title || "Dinasuvadu - Tamil News, Breaking News ,தமிழ் செய்திகள்";
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
    default:
      dynamicTitle = "Dinasuvadu - Tamil News, Breaking News ,தமிழ் செய்திகள்";
  }

  return (
    <>
      <title>{dynamicTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link
        rel="canonical"
        href={`https://dev.dinasuvadu.com${pathname || ""}`}
      />
      <meta property="og:title" content={dynamicTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`https://dev.dinasuvadu.com${pathname || ""}`} />
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
        crossOrigin=""
      />
    </>
  );
}