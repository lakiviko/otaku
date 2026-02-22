import { getTitleDetails } from "@/lib/tmdb";
import { buildPageMetadata, trimDescription } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    return buildPageMetadata({
      title: "Каст | Otaku",
      description: "Актерский состав в каталоге Otaku.",
      path: `/title/${type}/${id}/cast`
    });
  }

  try {
    const data = await getTitleDetails({ type, id, language: "ru-RU" });

    return buildPageMetadata({
      title: `Каст: ${data.title} | Otaku`,
      description: trimDescription(`Актерский состав ${data.title} в каталоге Otaku.`),
      path: `/title/${type}/${id}/cast`,
      image: data.poster || data.backdrop || undefined,
      openGraphType: "video.other"
    });
  } catch {
    return buildPageMetadata({
      title: "Каст | Otaku",
      description: "Актерский состав в каталоге Otaku.",
      path: `/title/${type}/${id}/cast`
    });
  }
}

export default function TitleCastLayout({ children }) {
  return children;
}
