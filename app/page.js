import Link from "next/link";
import { getAllShelves } from "@/lib/shelves";
import { PageHeader } from "@/components/header-context";

export default async function HomePage() {
  const shelves = await getAllShelves();

  return (
    <main>
      <PageHeader eyebrow="Otaku Catalog" title="Мои полки" />
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
