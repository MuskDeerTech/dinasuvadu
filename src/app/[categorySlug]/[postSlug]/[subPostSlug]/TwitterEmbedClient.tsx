"use client";

// Extend Window interface to include twttr
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: () => void;
      };
    };
  }
}

import { useEffect, useRef } from "react";

type TwitterEmbedClientProps = {
  html: string;
};

export default function TwitterEmbedClient({ html }: TwitterEmbedClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // Set the innerHTML with the Twitter embed
    containerRef.current.innerHTML = html;

    // Load the Twitter widgets script if not already loaded
    if (!window.twttr) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.onload = () => {
        if (window.twttr) {
          window.twttr.widgets.load();
        }
      };
      document.body.appendChild(script);
    } else {
      // If script is already loaded, initialize the widget
      window.twttr?.widgets.load();
    }
  }, [html]); // Re-run if HTML changes

  return <div ref={containerRef} className="mb-12 twitter-embed" />;
}