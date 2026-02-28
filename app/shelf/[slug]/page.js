import Link from "next/link";
import { notFound } from "next/navigation";
import { getShelfBySlug } from "@/lib/shelves";
import { getTitleCardsByRefs } from "@/lib/tmdb";
import { getServerAuthSession } from "@/lib/github-auth";
import { PageHeader } from "@/components/header-context";
import { buildPageMetadata, trimDescription } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    return buildPageMetadata({
      title: "Полка не найдена | Otaku",
      description: "Запрошенная полка не найдена в каталоге Otaku.",
      path: `/shelf/${slug}`
    });
  }

  return buildPageMetadata({
    title: `${shelf.name} | Otaku`,
    description: trimDescription(shelf.overview || `Подборка "${shelf.name}" в каталоге Otaku.`),
    path: `/shelf/${slug}`
  });
}

export default async function ShelfPage({ params }) {
  const { slug } = await params;
  const viewer = await getServerAuthSession();
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    notFound();
  }

  const allRefs = shelf.lists.flatMap((list) => list.items.map((item) => item.ref));
  const cardsByRef = await getTitleCardsByRefs(allRefs, "ru-RU");

  return (
    <main>
      <PageHeader eyebrow="Полка" title={shelf.name} />
      <section className="details">
        <div className="details-content">
          {shelf.overview ? <p className="card-meta">{shelf.overview}</p> : null}
          {shelf.lists.length ? (
            shelf.lists.map((list) => (
              <section className="shelf-section" key={list.key}>
                <h3>{list.name}</h3>
                {list.overview ? <p className="card-meta">{list.overview}</p> : null}
                <div className="shelf-items-grid">
                  {list.items.length ? (
                    list.items.map((item) => {
                      const card = cardsByRef.get(String(item.ref || "").trim());
                      if (card) {
                        return (
                          <Link href={card.href} className="card shelf-item-card" key={item.key}>
                            <img src={card.poster || "/icons/placeholder-poster.svg"} alt={card.title} loading="lazy" />
                            <div className="card-body">
                              <div className="badges">
                                <span className="badge">{card.type === "movie" ? "Фильм" : "Сериал"}</span>
                              </div>
                              <h4 className="card-title">{card.title}</h4>
                              <p className="card-meta">{card.year || "—"} • ★ {formatNumber(card.rating, 1)}</p>
                            </div>
                          </Link>
                        );
                      }
                      return (
                        <span className="item-chip invalid-chip" key={item.key}>
                          {String(item.ref || "invalid")}
                        </span>
                      );
                    })
                  ) : (
                    <p className="season-empty">Раздел пуст.</p>
                  )}
                </div>
              </section>
            ))
          ) : (
            <p className="season-empty">В этой полке пока нет разделов.</p>
          )}
          {viewer ? (
            <p className="badges">
              <Link href={`/shelf/${slug}/edit`} className="badge">Редактировать полку</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatNumber(value, digits) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
