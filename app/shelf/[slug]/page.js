import Link from "next/link";
import { notFound } from "next/navigation";
import { getShelfBySlug } from "@/lib/shelves";
import { getTitleCardsByRefs } from "@/lib/tmdb";

export default async function ShelfPage({ params }) {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    notFound();
  }

  const allRefs = shelf.lists.flatMap((list) => list.items.map((item) => item.ref));
  const cardsByRef = await getTitleCardsByRefs(allRefs, "ru-RU");

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">Shelf</p>
        <h1>{shelf.name}</h1>
        <div className="badges">
          <Link href="/" className="badge">← Все полки</Link>
          <Link href="/search" className="badge">Поиск</Link>
        </div>
        <p className="subtitle">{shelf.overview || "Без описания"}</p>
      </header>

      <section className="details">
        <div className="details-content">
          {shelf.lists.length ? (
            shelf.lists.map((list) => (
              <section key={list.key}>
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
        </div>
      </section>
    </main>
  );
}

function formatNumber(value, digits) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
