import { getTitleDetails } from "@/lib/tmdb";
import { buildPageMetadata, trimDescription } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    return buildPageMetadata({
      title: "Тайтл | Otaku",
      description: "Страница тайтла в каталоге Otaku.",
      path: `/title/${type}/${id}`
    });
  }

  try {
    const data = await getTitleDetails({ type, id, language: "ru-RU" });
    const year = data.releaseDate ? String(data.releaseDate).slice(0, 4) : "";

    return buildPageMetadata({
      title: `${data.title}${year ? ` (${year})` : ""} | Otaku`,
      description: trimDescription(data.overview || `${data.title} в каталоге Otaku.`),
      path: `/title/${type}/${id}`,
      image: data.backdrop || data.poster || undefined,
      openGraphType: "video.other"
    });
  } catch {
    return buildPageMetadata({
      title: "Тайтл | Otaku",
      description: "Страница тайтла в каталоге Otaku.",
      path: `/title/${type}/${id}`
    });
  }
}

export default function TitleLayout({ children }) {
  return children;
}
