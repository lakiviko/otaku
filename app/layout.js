import "./globals.css";
import { Suspense } from "react";
import { HeaderProvider } from "@/components/header-context";
import SiteHeader from "@/components/site-header";
import { buildPageMetadata, getMetadataBase, SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";

export const metadata = {
  metadataBase: getMetadataBase(),
  ...buildPageMetadata({
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    path: "/"
  }),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="noise" />
        <HeaderProvider initial={{ eyebrow: "Otaku Catalog", title: "Мои полки" }}>
          <div className="app">
            <Suspense fallback={null}>
              <SiteHeader />
            </Suspense>
            {children}
          </div>
        </HeaderProvider>
      </body>
    </html>
  );
}
