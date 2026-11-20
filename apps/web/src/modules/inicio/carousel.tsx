"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenText, QrCode, UtensilsCrossed, Sparkles } from "lucide-react";
import type { Slide } from "./slides";

const INTERVAL_MS = 6000;
const icons = { granate: UtensilsCrossed, verde: QrCode, dorado: Sparkles };

export function Carousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const count = slides.length;
  useEffect(() => {
    if (hovered || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setIndex(i => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, hovered, count]);

  return (
    <section
      className="carousel"
      aria-roledescription="carrusel"
      aria-label="Presentación"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, i) => {
          const Icon = icons[slide.tone] || UtensilsCrossed;
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <article
              key={slide.id}
              className={`carousel-slide tone-${slide.tone}`}
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${count}: ${slide.title}`}
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <div className="carousel-copy">
                <span className="carousel-eyebrow">{slide.eyebrow}</span>
                <Heading>{slide.title}</Heading>
                <p>{slide.text}</p>
                <div className="carousel-actions">
                  <Link className="site-text-link" href={slide.action.href}>
                    <Icon aria-hidden /> {slide.action.label}
                  </Link>
                  {slide.secondary && (
                    <Link className="site-text-link" href={slide.secondary.href}>
                      <BookOpenText aria-hidden /> {slide.secondary.label}
                    </Link>
                  )}
                </div>
              </div>

              <div className={slide.image ? "carousel-art has-image" : "carousel-art"}>
                {slide.image ? (
                  <Image
                    src={slide.image.src}
                    alt={slide.image.alt}
                    width={720}
                    height={720}
                    sizes="(max-width: 760px) 50vw, 360px"
                    priority={i === 0}
                  />
                ) : (
                  <Icon aria-hidden />
                )}
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 && (
        <div className="carousel-dots" role="group" aria-label="Diapositivas">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir a la diapositiva ${i + 1}: ${slide.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
