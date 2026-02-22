import { getPersonDetails } from "@/lib/tmdb";
import { buildPageMetadata, trimDescription } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;

  try {
    const person = await getPersonDetails({ id, language: "ru-RU" });
    return buildPageMetadata({
      title: `${person.name} | Otaku`,
      description: trimDescription(person.biography || `${person.name} — персона в каталоге Otaku.`),
      path: `/person/${id}`,
      image: person.profile || undefined,
      openGraphType: "profile"
    });
  } catch {
    return buildPageMetadata({
      title: "Персона | Otaku",
      description: "Страница персоны в каталоге Otaku.",
      path: `/person/${id}`
    });
  }
}

export default function PersonLayout({ children }) {
  return children;
}
