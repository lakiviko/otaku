import { Suspense } from "react";
import SearchClientPage from "./search-client";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Поиск | Otaku",
  description: "Поиск фильмов, сериалов и персон в каталоге Otaku.",
  path: "/search"
});

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main>
          <section className="results-wrap">
            <p className="status">Загрузка...</p>
          </section>
        </main>
      }
    >
      <SearchClientPage />
    </Suspense>
  );
}
