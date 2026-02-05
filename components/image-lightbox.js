"use client";

import { useEffect } from "react";

export default function ImageLightbox({ slides, open, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onPrev, onNext]);

  if (!open || !slides.length) return null;

  const slide = slides[index] || slides[0];

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Просмотр изображения" onClick={onClose}>
      <button className="lightbox-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
      <button className="lightbox-nav lightbox-prev" type="button" onClick={(event) => { event.stopPropagation(); onPrev(); }} aria-label="Предыдущее">‹</button>
      <figure className="lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <img src={slide.src} alt={slide.alt || "image"} />
        <a className="lightbox-open-original" href={slide.src} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          Open Original
        </a>
        {slide.caption ? <figcaption>{slide.caption}</figcaption> : null}
      </figure>
      <button className="lightbox-nav lightbox-next" type="button" onClick={(event) => { event.stopPropagation(); onNext(); }} aria-label="Следующее">›</button>
    </div>
  );
}
