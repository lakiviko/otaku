const SITE_NAME = "Otaku";
const DEFAULT_DESCRIPTION = "TMDB-powered Otaku app";
const DEFAULT_OG_IMAGE = "/android-chrome-512x512.png";
const FALLBACK_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value) {
  if (!value) return FALLBACK_ORIGIN;
  const raw = String(value).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function getMetadataBase() {
  const rawSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL;
  const rawVercelUrl = process.env.VERCEL_URL;

  const origin = rawSiteUrl
    ? normalizeOrigin(rawSiteUrl)
    : rawVercelUrl
      ? normalizeOrigin(`https://${rawVercelUrl}`)
      : FALLBACK_ORIGIN;

  return new URL(origin);
}

export function trimDescription(value, maxLength = 200) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function buildPageMetadata({ title, description, path = "/", image, openGraphType = "website" }) {
  const safeTitle = title || SITE_NAME;
  const safeDescription = trimDescription(description || DEFAULT_DESCRIPTION, 200) || DEFAULT_DESCRIPTION;
  const safeImage = image || DEFAULT_OG_IMAGE;

  return {
    title: safeTitle,
    description: safeDescription,
    alternates: {
      canonical: path
    },
    openGraph: {
      type: openGraphType,
      locale: "ru_RU",
      siteName: SITE_NAME,
      url: path,
      title: safeTitle,
      description: safeDescription,
      images: [{ url: safeImage, alt: safeTitle }]
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: [safeImage]
    }
  };
}

export { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE };
