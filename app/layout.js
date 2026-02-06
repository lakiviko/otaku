import "./globals.css";
import { HeaderProvider } from "@/components/header-context";
import SiteHeader from "@/components/site-header";

export const metadata = {
  title: "Otaku",
  description: "TMDB-powered Otaku app",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="noise" />
        <HeaderProvider initial={{ eyebrow: "Otaku Catalog", title: "Мои полки" }}>
          <div className="app">
            <SiteHeader />
            {children}
          </div>
        </HeaderProvider>
      </body>
    </html>
  );
}
