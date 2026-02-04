"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

export default function SeasonPage({ params }) {
  const { type, id, seasonNumber } = use(params);
  const [status, setStatus] = useState("Загружаю сезон...");
  const [title, setTitle] = useState(null);
  const [season, setSeason] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSeason() {
      if (type !== "tv") {
        setStatus("Сезоны доступны только для сериалов.");
        return;
      }

      try {
        const [titleRes, seasonRes] = await Promise.all([
          fetch(`/api/title/${type}/${id}?language=ru-RU`),
          fetch(`/api/title/tv/${id}/season/${seasonNumber}?language=ru-RU`)
        ]);

        const [titlePayload, seasonPayload] = await Promise.all([titleRes.json(), seasonRes.json()]);
        if (!titleRes.ok) throw new Error(titlePayload.detail || titlePayload.error || "Title error");
        if (!seasonRes.ok) throw new Error(seasonPayload.detail || seasonPayload.error || "Season error");
        if (!active) return;

        setTitle(titlePayload);
        setSeason(seasonPayload);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(`Ошибка загрузки сезона: ${error.message}`);
      }
    }

    loadSeason();
    return () => {
      active = false;
    };
  }, [id, seasonNumber, type]);

  if (!season || !title) {
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
        <p className="eyebrow">Season</p>
        <h1>{title.title}</h1>
        <div className="badges">
          <Link href={`/title/${type}/${id}`} className="badge">← К тайтлу</Link>
          <span className="badge">{season.name || `Сезон ${seasonNumber}`}</span>
        </div>
      </header>

      <section className="details">
        <div className="details-content">
          <article className="season-details">
            <img src={season.poster || "/icons/placeholder-poster.svg"} alt={season.name || `Сезон ${seasonNumber}`} className="season-details-poster" />
            <div className="season-details-body">
              <h3>{season.name || `Сезон ${seasonNumber}`}</h3>
              <div className="meta-grid">
                <div className="meta-item"><span className="meta-label">Номер сезона</span><p>{season.seasonNumber}</p></div>
                <div className="meta-item"><span className="meta-label">Серий</span><p>{season.episodeCount || "—"}</p></div>
                <div className="meta-item"><span className="meta-label">Дата выхода</span><p>{season.airDate || "—"}</p></div>
              </div>
              <p>{season.overview || "Описание сезона отсутствует."}</p>
            </div>
          </article>

          <section>
            <h3>Эпизоды</h3>
            <div className="episodes-list">
              {(season.episodes || []).length ? (
                (season.episodes || []).map((episode) => (
                  <article className="episode-row" key={episode.id}>
                    <img src={episode.still || "/icons/placeholder-poster.svg"} alt={episode.name || `Эпизод ${episode.episodeNumber}`} loading="lazy" />
                    <div className="episode-row-body">
                      <h4>{episode.episodeNumber}. {episode.name || "Без названия"}</h4>
                      <p>{episode.airDate || "дата неизвестна"} • {typeof episode.runtime === "number" ? `${episode.runtime} мин` : "—"}</p>
                      {episode.overview ? <p>{episode.overview}</p> : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="season-empty">Нет данных по эпизодам.</p>
              )}
            </div>
          </section>
          </div>
      </section>
    </main>
  );
}
