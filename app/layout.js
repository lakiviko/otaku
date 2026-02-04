import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
