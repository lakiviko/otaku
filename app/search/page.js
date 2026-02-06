import { Suspense } from "react";
import SearchClientPage from "./search-client";

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
