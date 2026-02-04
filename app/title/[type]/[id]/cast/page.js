"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

export default function CastPage({ params }) {
  const { type, id } = use(params);
  const castLanguage = "ru-RU";
  const [status, setStatus] = useState("Загружаю актеров...");
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadCast() {
      try {
        const response = await fetch(`/api/title/${type}/${id}/cast?language=${castLanguage}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || payload.error || "Cast error");
        if (!active) return;
        setData(payload);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(`Ошибка загрузки актеров: ${error.message}`);
      }
    }

    loadCast();
    return () => {
      active = false;
    };
  }, [id, type]);

  if (!data) {
    return (
      <main className="app">
        <header className="hero">
          <Link href={`/title/${type}/${id}`} className="badge">← Назад к тайтлу</Link>
          <p className="status">{status}</p>
        </header>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">Cast</p>
        <h1>{data.title}</h1>
        <div className="badges">
          <Link href={`/title/${type}/${id}`} className="badge">← К тайтлу</Link>
          <span className="badge">{data.mediaType === "tv" ? "Сериал" : "Фильм"}</span>
        </div>
      </header>

      <section className="details">
        <div className="details-content">
          <h3>Актеры</h3>
          <div className="cast">
            {(data.cast || []).length
              ? data.cast.map((actor) => (
                  <Link href={`/person/${actor.id}`} className="cast-card cast-link" key={actor.id}>
                    <img src={actor.profile || "/icons/placeholder-profile.svg"} alt={actor.name} loading="lazy" />
                    <h4>{actor.name}</h4>
                    <p>{actor.character || "—"}{data.mediaType === "tv" && actor.episodes ? ` • ${actor.episodes} эп.` : ""}</p>
                  </Link>
                ))
              : <p>Нет данных по актерам.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
