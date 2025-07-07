"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type HeaderProps = {
  categories: Category[];
};

export default function Header({ categories }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [underlineWidth, setUnderlineWidth] = useState(0);

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) setSearchQuery("");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery)}`);
      setSearchVisible(false);
    }
  };

  // Define the fixed category titles and their default slugs
  const fixedCategories = [
    { title: "Home", slug: "/", id: "home" },
    { title: "தமிழ்நாடு", slug: "tamilnadu", id: "cat-tamilnadu" },
    { title: "இந்தியா", slug: "india", id: "cat-india" },
    { title: "உலகம்", slug: "world", id: "cat-world" },
    { title: "சினிமா", slug: "cinema", id: "cat-cinema" },
    { title: "விளையாட்டு", slug: "sports", id: "cat-sports" },
    { title: "தொழிநுட்பம்", slug: "technology", id: "cat-technology" },
    { title: "ஆட்டோமொபைல்", slug: "automobile", id: "cat-automobile" },
    { title: "லைஃப்ஸ்டைல்", slug: "lifestyle", id: "cat-lifestyle" },
    { title: "ஆன்மீகம்", slug: "spirituality", id: "cat-spirituality" },
  ];

  // Map fixed categories to the categories prop data, falling back to defaults
  const sortedCategories = fixedCategories.map((fixedCategory) => {
    const categoryFromProp = categories.find((cat) => cat.title === fixedCategory.title);
    // Ensure every category has a parent property (even if undefined)
    if (categoryFromProp) {
      return categoryFromProp;
    } else {
      return { ...fixedCategory, parent: undefined };
    }
  });

  const getSelectedKey = () => {
    if (pathname === "/") return "home";
    const segments = pathname.split("/").filter(Boolean);

    // Check if it's a category listing page (e.g., /category-slug or /parent-slug/category-slug)
    if (segments.length === 1 || segments.length === 2) {
      for (const category of sortedCategories) {
        const parentSlug =
          category.parent && typeof category.parent !== "string"
            ? category.parent.slug || "uncategorized"
            : null;
        const categoryPath = parentSlug
          ? `/${parentSlug}/${category.slug}`
          : `/${category.slug}`;

        if (pathname === categoryPath) return category.id;
      }
    }
    // Return empty string for post pages or other routes
    return "";
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      console.log(
        "Scroll Position:",
        scrollPosition,
        "isScrolled:",
        scrollPosition > 64
      );
      setIsScrolled(scrollPosition > 64);

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction =
        maxScroll > 0 ? Math.min(scrollPosition / maxScroll, 1) : 0;

      const activeItem = document.querySelector(".drawer-menu li.active");
      if (activeItem) {
        const activeItemWidth = activeItem.getBoundingClientRect().width;
        const newWidth = scrollFraction * activeItemWidth;
        setUnderlineWidth(newWidth);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const selectedKey = getSelectedKey();

  return (
    <>
      <header className="site site-main">
        <div className="main-header">
          <div className={`header-one ${isScrolled ? "hidden" : ""}`}>
            <button className="menu-btn" onClick={() => setDrawerVisible(true)}>
              ☰
            </button>
            <Link href="/" className="logo-link">
              <img
                src="/dinasuvadu.svg"
                alt="Dinasuvadu Logo"
                className="logo"
              />
            </Link>
            <button
              className="search-btn"
              onClick={toggleSearch}
              title="Search"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </button>
          </div>

          <nav className={`header-two ${isScrolled ? "sticky" : ""}`}>
            <ul className="drawer-menu">
            

              {sortedCategories.map((category) => {
                const parentSlug =
                  category.parent && typeof category.parent !== "string"
                    ? category.parent.slug || "uncategorized"
                    : null;
                const href = parentSlug
                  ? `/${parentSlug}/${category.slug}`
                  : `/${category.slug}`;
                return (
                  <li
                    key={category.id}
                    className={selectedKey === category.id ? "active" : ""}
                  >
                    <Link href={href}>{category.title}</Link>
                    {selectedKey === category.id && (
                      <span
                        className="underline-bar"
                        style={{ width: `${underlineWidth}px` }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={`search-bar ${searchVisible ? "visible" : "hidden"}`}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch} title="Search">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer with Backdrop */}
      <>
        {/* Backdrop */}
        {drawerVisible && (
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerVisible(false)}
          />
        )}

        {/* Drawer */}
        <div className={`mobile-drawer ${drawerVisible ? "open" : ""}`}>
          <button className="close-btn" onClick={() => setDrawerVisible(false)}>
            ✕
          </button>

          <ul className="drawer-menu-vertical">
            <li onClick={() => setDrawerVisible(false)}>
              <Link href="/" className="logo-link">
                <img
                  src="/dinasuvadu.svg"
                  alt="Dinasuvadu Logo"
                  className="mob-logo"
                />
              </Link>
            </li>
            {sortedCategories.map((category) => {
              const parentSlug =
                category.parent && typeof category.parent !== "string"
                  ? category.parent.slug || "uncategorized"
                  : null;
              const href = parentSlug
                ? `/${parentSlug}/${category.slug}`
                : `/${category.slug}`;
              return (
                <li key={category.id} onClick={() => setDrawerVisible(false)}>
                  <Link href={href}>{category.title}</Link>
                </li>
              );
            })}
     
           
          </ul>
        </div>
      </>
    </>
  );
}
