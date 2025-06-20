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

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://admin.dinasuvadu.com/";

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories?depth=2`);
    const categories = res.data.docs || [];
    console.log("Fetched categories for layout:", categories);
    return categories;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "data" in err.response
    ) {
      console.error("Error fetching categories for layout:", err.response.data);
    } else if (err instanceof Error) {
      console.error("Error fetching categories for layout:", err.message);
    } else {
      console.error("Error fetching categories for layout:", err);
    }
    return [];
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await fetchCategories();

  return (
    <html lang="ta" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header categories={categories} />
        {children}
        <Footer />
      </body>
    </html>
  );
}