"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHeader } from "./header-context";

export default function SiteHeader() {
  const { header } = useHeader();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    const nextQuery = (searchParams.get("q") || "").trim();
    setQuery(nextQuery);
  }, [searchParams]);

  useEffect(() => {
    if (mobileSearchOpen) {
      inputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const handleChange = () => {
      setIsMobile(media.matches);
      if (media.matches) {
        setMobileSearchOpen(false);
      }
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function onSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setMobileSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function openMobileSearch() {
    setMobileSearchOpen(true);
  }

  function closeMobileSearch() {
    setMobileSearchOpen(false);
  }

  function handleSearchBlur(event) {
    if (!mobileSearchOpen) return;
    if (ignoreBlurRef.current) {
      ignoreBlurRef.current = false;
      return;
    }
    const nextTarget = event.relatedTarget;
    if (!formRef.current?.contains(nextTarget)) {
      closeMobileSearch();
    }
  }

  function handlePointerDown() {
    ignoreBlurRef.current = true;
  }

  function onToggleClick() {
    if (isMobile) {
      router.push("/search");
      return;
    }
    if (!mobileSearchOpen) {
      openMobileSearch();
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <header className={`hero site-header${mobileSearchOpen ? " search-open" : ""}`}>
      <Link href="/" className="hero-main">
        <p className="eyebrow">{header.eyebrow}</p>
        <h1>{header.title}</h1>
      </Link>
      {!mobileSearchOpen ? (
        <button
          className="search-toggle"
          type="button"
          onClick={onToggleClick}
          aria-expanded={mobileSearchOpen}
          aria-controls="site-search"
          aria-label="Открыть поиск"
        >
          <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" />
            <line x1="16.2" y1="16.2" x2="21" y2="21" />
          </svg>
        </button>
      ) : null}
      <form
        ref={formRef}
        className="search site-search"
        id="site-search"
        role="search"
        onSubmit={onSubmit}
        onBlur={handleSearchBlur}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="One Piece, Arcane, DiCaprio"
          required
          minLength={2}
        />
        <button type="submit" onMouseDown={handlePointerDown} onTouchStart={handlePointerDown} aria-label="Найти">
          {mobileSearchOpen ? "Поиск" : "Найти"}
        </button>
      </form>
    </header>
  );
}
