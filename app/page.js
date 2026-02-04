import Link from "next/link";
import { getAllShelves } from "@/lib/shelves";

export default async function HomePage() {
  const shelves = await getAllShelves();

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">Otaku Catalog</p>
        <h1>Мои полки</h1>
        <div className="badges">
          <Link href="/search" className="badge">Перейти в поиск</Link>
        </div>
      </header>

      <section className="results-wrap">
        {shelves.length ? (
          <div className="shelves-grid">
            {shelves.map((shelf) => (
              <Link href={`/shelf/${shelf.slug}`} className="shelf-card" key={shelf.slug}>
                <h3>{shelf.name}</h3>
                <p>{shelf.overview || "Без описания"}</p>
                <p className="card-meta">Разделов: {shelf.listsCount} • Тайтлов: {shelf.itemsCount}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="status">Полки не найдены. Положи `.json` или `.jsonc` файлы в `data/lists`.</p>
        )}
      </section>
    </main>
  );
}
