"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

export default function PersonPage({ params }) {
  const { id } = use(params);
  const [status, setStatus] = useState("Загружаю биографию...");
  const [person, setPerson] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPerson() {
      try {
        const response = await fetch(`/api/person/${id}?language=ru-RU`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || payload.error || "Person error");
        if (!active) return;
        setPerson(payload);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(`Ошибка загрузки биографии: ${error.message}`);
      }
    }

    loadPerson();
    return () => {
      active = false;
    };
  }, [id]);

  if (!person) {
    return (
      <main className="app">
        <header className="hero">
          <Link href="/" className="badge">← Назад</Link>
          <p className="status">{status}</p>
        </header>
      </main>
    );
  }

  const links = [
    person.external.instagram ? { label: "Instagram", href: `https://instagram.com/${person.external.instagram}` } : null,
    person.external.twitter ? { label: "X", href: `https://x.com/${person.external.twitter}` } : null,
    person.external.youtube ? { label: "YouTube", href: `https://youtube.com/${person.external.youtube}` } : null,
    person.external.imdb ? { label: "IMDb", href: `https://www.imdb.com/name/${person.external.imdb}` } : null
  ].filter(Boolean);

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">Person</p>
        <h1>{person.name}</h1>
        <Link href="/" className="badge">На Гравную</Link>
        <Link href="/" className="badge">Перейти в поиск</Link>
      </header>

      <section className="details">
        <div className="details-content">
          <article className="person-layout">
            <img className="person-photo" src={person.profile || "/icons/placeholder-profile.svg"} alt={person.name} />
            <div className="person-main">
              <h3>Биография</h3>
              <p className="person-bio-text">{person.biography || "Биография отсутствует."}</p>
              <div className="meta-grid">
                <div className="meta-item"><span className="meta-label">Профессия</span><p>{person.knownForDepartment || "—"}</p></div>
                <div className="meta-item"><span className="meta-label">Дата рождения</span><p>{person.birthday || "—"}</p></div>
                <div className="meta-item"><span className="meta-label">Место рождения</span><p>{person.placeOfBirth || "—"}</p></div>
                {person.deathday ? <div className="meta-item"><span className="meta-label">Дата смерти</span><p>{person.deathday}</p></div> : null}
              </div>
              {links.length ? (
                <div className="badges">
                  {links.map((item) => (
                    <a key={item.label} href={item.href} className="badge" target="_blank" rel="noreferrer">{item.label}</a>
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          <section>
            <h3>Известные работы</h3>
            <div className="recommendations-grid">
              {(person.credits || []).length
                ? person.credits.map((credit) => (
                    <Link href={`/title/${credit.mediaType}/${credit.id}`} className="recommendation-card" key={`${credit.mediaType}-${credit.id}`}>
                      <img src={credit.poster || "/icons/placeholder-poster.svg"} alt={credit.title || "Проект"} loading="lazy" />
                      <div>
                        <h4>{credit.title || "Без названия"}</h4>
                        <p>{credit.year || "—"}{credit.character ? ` • ${credit.character}` : ""}</p>
                      </div>
                    </Link>
                  ))
                : <p className="season-empty">Нет данных по фильмографии.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
