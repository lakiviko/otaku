"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import ImageLightbox from "@/components/image-lightbox";
import { PageHeader } from "@/components/header-context";

export default function TitlePage({ params }) {
  const { type, id } = use(params);
  const [status, setStatus] = useState("Загружаю карточку...");
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTitle() {
      try {
        const response = await fetch(`/api/title/${type}/${id}?language=ru-RU`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || payload.error || "Detail error");
        if (!active) return;
        setData(payload);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(`Ошибка загрузки карточки: ${error.message}`);
      }
    }

    loadTitle();
    return () => {
      active = false;
    };
  }, [id, type]);

  if (!data) {
    return (
      <main>
        <PageHeader eyebrow="Тайтл" title="Загрузка..." />
        <section className="results-wrap">
          <p className="status">{status}</p>
        </section>
      </main>
    );
  }

  const isTv = data.mediaType === "tv";
  const year = data.releaseDate ? String(data.releaseDate).slice(0, 4) : "—";
  const genres = (data.genres || []).map((genre) => genre.name).join(", ") || "—";
  const countries = (data.countries || []).map((country) => country.name).join(", ") || "—";
  const runtime = data.runtime ? `${data.runtime} мин` : "—";
  const creators = data.creators || [];
  const topCast = data.cast || [];
  const mediaVideos = [];
  const mediaBackdrops = data.popularMedia?.backdrops || [];
  const recommendations = data.recommendations || [];
  const copyValue = `${type}/${id}`;
  const slides = [
    data.poster ? { src: toOriginalImage(data.poster), alt: data.title, caption: `${data.title} — постер` } : null,
    ...mediaBackdrops.map((item, index) => ({
      src: toOriginalImage(item.image),
      alt: `Кадр ${index + 1}`,
      caption: `Популярные медиа #${index + 1}`
    }))
  ].filter(Boolean);
  const posterSlideIndex = 0;
  const mediaStartIndex = data.poster ? 1 : 0;

  async function copyTitlePath() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // noop
    }
  }

  function openLightbox(index) {
    if (!slides.length) return;
    setLightboxIndex(Math.max(0, Math.min(index, slides.length - 1)));
    setLightboxOpen(true);
  }

  return (
    <main>
      <PageHeader eyebrow="Тайтл" title={data.title} />
      <section className="details">
        <div className="details-backdrop" style={{ backgroundImage: `url('${data.backdrop || data.poster || ""}')` }}>
          <div className="details-head">
            {data.poster ? (
              <button type="button" className="image-trigger" onClick={() => openLightbox(posterSlideIndex)}>
                <img className="details-poster" src={data.poster} alt={data.title} />
              </button>
            ) : (
              <img className="details-poster" src="/icons/placeholder-poster.svg" alt={data.title} />
            )}
            <div>
              <h2 className="details-title">{data.title} ({year})</h2>
              <p className="details-sub">{data.originalTitle || ""}{data.tagline ? ` • ${data.tagline}` : ""}</p>
              <div className="badges">
                <span className="badge">★ {formatNumber(data.rating, 1)}</span>
                <span className="badge">{isTv ? "Сериал" : "Фильм"}</span>
                <Link href={`https://themoviedb.org/${type}/${id}`} className="badge">TMDB</Link>
                <button className="badge icon-badge" type="button" onClick={copyTitlePath} aria-label={`Copy ${copyValue}`} title={copied ? "Copied" : `Copy ${copyValue}`}>
                  {copied ? "✓" : "⧉"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="details-content">
          <p>{data.overview || "Описание отсутствует."}</p>
          <div className="meta-grid">
            <div className="meta-item"><span className="meta-label">Жанры</span><p>{genres}</p></div>
            {isTv ? <div className="meta-item"><span className="meta-label">Сезонов</span><p>{formatNumber(data.seasonsCount, 0)}</p></div> : <div className="meta-item"><span className="meta-label">Хронометраж</span><p>{runtime}</p></div>}
            {isTv ? <div className="meta-item"><span className="meta-label">Серий</span><p>{formatNumber(data.episodesCount, 0)}</p></div> : null}
            <div className="meta-item"><span className="meta-label">Статус</span><p>{data.status || "—"}</p></div>
            <div className="meta-item"><span className="meta-label">Страна</span><p>{countries}</p></div>
            <div className="meta-item"><span className="meta-label">Оценок</span><p>{formatNumber(data.voteCount, 0)}</p></div>
          </div>

          {creators.length ? (
            <section>
              <h3>Создатели</h3>
              <div className="cast">
                {creators.map((person, index) => {
                  const content = (
                    <>
                      <img src={person.profile || "/icons/placeholder-profile.svg"} alt={person.name} loading="lazy" />
                      <h4>{person.name}</h4>
                      <p>{person.role}</p>
                    </>
                  );

                  return person.id ? (
                    <Link href={`/person/${person.id}`} className="cast-card cast-link" key={`${person.role}-${person.id}-${index}`}>
                      {content}
                    </Link>
                  ) : (
                    <article className="cast-card" key={`${person.role}-${person.name}-${index}`}>
                      {content}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {isTv ? (
            <section>
              <h3>Сезоны и серии</h3>
              <div className="seasons">
                {(data.seasons || []).map((season) => {
                  return (
                    <div className="season-block" key={season.id || season.seasonNumber}>
                      <Link href={`/title/${type}/${id}/season/${season.seasonNumber}`} className="season-link">
                        <article className="season-card">
                          <img src={season.poster || "/icons/placeholder-poster.svg"} alt={season.name || `Сезон ${season.seasonNumber}`} loading="lazy" />
                          <div className="season-body">
                            <h4>{season.name || `Сезон ${season.seasonNumber}`}</h4>
                            <p>{season.episodeCount || "—"} серий • {(season.airDate || "").slice(0, 4) || "—"}</p>
                            {season.overview ? <p className="season-overview">{season.overview}</p> : null}
                          </div>
                        </article>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section>
            <div className="section-head">
              <h3>Каст</h3>
              <Link href={`/title/${type}/${id}/cast`} className="badge">Смотреть весь</Link>
            </div>
            <div className="cast">
              {topCast.length
                ? topCast.map((actor) => (
                    <Link href={`/person/${actor.id}`} className="cast-card cast-link" key={actor.id}>
                      <img src={actor.profile || "/icons/placeholder-profile.svg"} alt={actor.name} loading="lazy" />
                      <h4>{actor.name}</h4>
                      <p>{actor.character || "—"}</p>
                    </Link>
                  ))
                : <p className="season-empty">Нет данных по актерам.</p>}
            </div>
          </section>

          <section>
            <h3>Популярные медиа</h3>
            <div className="media-grid">
              {mediaBackdrops.map((item, index) => (
                <button key={`backdrop-${index}`} type="button" className="image-trigger media-trigger" onClick={() => openLightbox(mediaStartIndex + index)}>
                  <img src={item.image || "/icons/placeholder-poster.svg"} alt={`Кадр ${index + 1}`} loading="lazy" />
                </button>
              ))}
              {!mediaBackdrops.length ? <p className="season-empty">Нет медиа.</p> : null}
            </div>
          </section>

          <section>
            <h3>Рекомендации</h3>
            <div className="recommendations-grid">
              {recommendations.length
                ? recommendations.map((item) => (
                    <Link href={`/title/${type}/${item.id}`} className="recommendation-card" key={item.id}>
                      <img src={item.poster || "/icons/placeholder-poster.svg"} alt={item.title || "Рекомендация"} loading="lazy" />
                      <div>
                        <h4>{item.title || "Без названия"}</h4>
                        <p>{item.year || "—"} • ★ {formatNumber(item.rating, 1)}</p>
                      </div>
                    </Link>
                  ))
                : <p className="season-empty">Нет рекомендаций.</p>}
            </div>
          </section>
        </div>
      </section>

      <ImageLightbox
        slides={slides}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setLightboxIndex((prev) => (prev - 1 + slides.length) % slides.length)}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % slides.length)}
      />
    </main>
  );
}

function trimText(value, maxLen) {
  if (!value) return "";
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

function formatNumber(value, digits) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function toOriginalImage(url) {
  if (!url) return url;
  const match = String(url).match(/^\/api\/image\/[^/]+\/(.+)$/);
  if (!match) return url;
  return `/api/image/original/${match[1]}`;
}
