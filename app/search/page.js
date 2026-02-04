import { Suspense } from "react";
import SearchClientPage from "./search-client";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="app">
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
