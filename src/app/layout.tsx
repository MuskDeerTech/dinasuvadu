import "./globals.css";
import "antd/dist/reset.css";
import Header from "../components/Header";
import axios from "axios";
import Footer from "../components/Footer";

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://editor.dinasuvadu.com/";

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories?depth=2`);
    const categories = res.data.docs || [];
    return categories;
  } catch (err) {
    return [];
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await fetchCategories();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sub.dinasuvadu.com";

  return (
    <html lang="ta" suppressHydrationWarning>
      <head>
        <link rel="preload" href="https://platform.twitter.com/widgets.js" as="script" />
      </head>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: baseUrl,
              name: "Dinasuvadu",
              description: "Tamil News, Breaking News, தமிழ் செய்திகள்",
              potentialAction: {
                "@type": "SearchAction",
                target: `${baseUrl}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsMediaOrganization",
              name: "Dinasuvadu",
              url: baseUrl,
              logo: `${baseUrl}/images/logo.png`,
              sameAs: [
                "https://www.facebook.com/dinasuvadu",
                "https://twitter.com/dinasuvadu",
                "https://www.instagram.com/dinasuvadu",
              ],
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  telephone: "+91-123-456-7890",
                  contactType: "customer service",
                  areaServed: "IN",
                  availableLanguage: ["Tamil", "English"],
                },
              ],
            }),
          }}
        />
        <Header categories={categories} />
        {children}
        <Footer />
      </body>
    </html>
  );
}