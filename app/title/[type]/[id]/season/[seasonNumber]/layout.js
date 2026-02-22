import { getSeasonDetails, getTitleDetails } from "@/lib/tmdb";
import { buildPageMetadata, trimDescription } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { type, id, seasonNumber } = await params;

  if (type !== "tv") {
    return buildPageMetadata({
      title: "Сезон | Otaku",
      description: "Страница сезона в каталоге Otaku.",
      path: `/title/${type}/${id}/season/${seasonNumber}`
    });
  }

  try {
    const [title, season] = await Promise.all([
      getTitleDetails({ type, id, language: "ru-RU" }),
      getSeasonDetails({ id, seasonNumber, language: "ru-RU" })
    ]);

    const seasonLabel = season.name || `Сезон ${seasonNumber}`;

    return buildPageMetadata({
      title: `${seasonLabel} — ${title.title} | Otaku`,
      description: trimDescription(season.overview || `${seasonLabel} сериала ${title.title} в каталоге Otaku.`),
      path: `/title/${type}/${id}/season/${seasonNumber}`,
      image: season.poster || title.poster || title.backdrop || undefined,
      openGraphType: "video.episode"
    });
  } catch {
    return buildPageMetadata({
      title: "Сезон | Otaku",
      description: "Страница сезона в каталоге Otaku.",
      path: `/title/${type}/${id}/season/${seasonNumber}`
    });
  }
}

export default function SeasonLayout({ children }) {
  return children;
}
