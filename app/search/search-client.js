"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Введите запрос, чтобы начать поиск.");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = (searchParams.get("q") || "").trim();
    setQuery(q);

    if (q.length < 2) {
      setResults([]);
      setStatus("Введите запрос, чтобы начать поиск.");
      return;
    }

    let active = true;

    async function loadSearch() {
      setStatus("Ищу в TMDB...");
      setResults([]);

      try {
        const params = new URLSearchParams({ query: q, language: "ru-RU", page: "1" });
        const response = await fetch(`/api/search?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || payload.error || "Search error");
        if (!active) return;

        setResults(payload.results || []);
        setStatus(payload.results?.length ? `Найдено: ${payload.totalResults}. Показано ${payload.results.length}.` : "Ничего не найдено.");
      } catch (error) {
        if (!active) return;
        setStatus(`Ошибка поиска: ${error.message}`);
      }
    }

    loadSearch();
    return () => {
      active = false;
    };
  }, [searchParams]);

  function onSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">Otaku Catalog</p>
        <h1>Поиск фильмов, сериалов и людей</h1>
        <div className="badges">
          <Link href="/" className="badge">Мои полки</Link>
        </div>
        <form className="search" onSubmit={onSubmit}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="One Piece, Arcane, DiCaprio" required minLength={2} />
          <button type="submit">Найти</button>
        </form>
      </header>

      <section className="results-wrap">
        <p className="status">{status}</p>
        <div className="results">
          {results.map((item) => {
            const isPerson = item.mediaType === "person";
            const label = isPerson ? "Персона" : item.mediaType === "movie" ? "Фильм" : "Сериал";
            const href = isPerson ? `/person/${item.id}` : `/title/${item.mediaType}/${item.id}`;

            return (
              <Link className="card" href={href} key={`${item.mediaType}-${item.id}`}>
                <img src={item.poster || (isPerson ? "/icons/placeholder-profile.svg" : "/icons/placeholder-poster.svg")} alt={item.title} loading="lazy" />
                <div className="card-body">
                  <div className="badges">
                    <span className="badge">{label}</span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  {isPerson ? (
                    <p className="card-meta">
                      {item.knownForDepartment || "—"}
                      {item.knownFor?.length ? ` • ${item.knownFor.join(", ")}` : ""}
                    </p>
                  ) : (
                    <p className="card-meta">{item.year || "—"} • ★ {formatNumber(item.rating, 1)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function formatNumber(value, digits) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
