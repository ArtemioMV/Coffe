"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { Button } from "@restaurant/ui";
import type { GoogleReviews } from "./google-reviews";
import { restaurantMapsUrl } from "./location";

const number = new Intl.NumberFormat("es-PE");

function ReviewCard({ review }: { review: GoogleReviews["reviews"][number] }) {
  const { author } = review;
  return (
    <article className="review-card">
      <header className="review-author">
        {author.photoUri && <img className="review-avatar" src={author.photoUri} alt="" width={36} height={36} loading="lazy" referrerPolicy="no-referrer" />}
        <div>
          <strong>{author.uri ? <a href={author.uri}>{author.displayName}</a> : author.displayName}</strong>
          {review.relativePublishTimeDescription && <small>{review.relativePublishTimeDescription}</small>}
        </div>
      </header>
      <div className="review-stars" role="img" aria-label={`${review.rating} de 5 estrellas`}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={15} fill={index < review.rating ? "currentColor" : "none"} aria-hidden="true" />
        ))}
      </div>
      {review.text && <blockquote>{review.text}</blockquote>}
      {review.googleMapsUri && <a className="review-link" href={review.googleMapsUri}>Ver reseña en Google Maps <ExternalLink size={13} aria-hidden="true" /></a>}
    </article>
  );
}

export function GoogleReviewsPanel() {
  const [data, setData] = useState<GoogleReviews | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function showReviews() {
    setStatus("loading");
    try {
      const response = await fetch("/api/v1/public/reviews", { cache: "no-store" });
      if (!response.ok) throw new Error("Reseñas no disponibles");
      const { reviews }: { reviews: GoogleReviews | null } = await response.json();
      if (!reviews) throw new Error("Reseñas no disponibles");
      setData(reviews);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="reviews-body">
      <p className="reviews-status" role="status">
        {status === "loading" && "Cargando reseñas de Google Maps…"}
        {status === "error" && "Las reseñas de Google Maps no están disponibles en este momento."}
        {data?.reviews.length === 0 && "Google Maps todavía no muestra reseñas para esta ficha."}
      </p>
      {data && data.reviews.length > 0 && <p className="sr-only" role="status">Reseñas cargadas.</p>}
      {!data && (
        <div className="reviews-empty">
          <Button type="button" className="button-primary" onClick={showReviews} disabled={status === "loading"}>
            {status === "error" ? "Volver a intentar" : "Cargar reseñas de Google Maps"}
          </Button>
          <a className="review-link" href={restaurantMapsUrl}>Ver opiniones en Google Maps <ExternalLink size={13} aria-hidden="true" /></a>
          {status === "error" && <Link className="review-link" href="/sugerencias">Comparte tu experiencia</Link>}
        </div>
      )}
      {data && (
        <div className="reviews-layout">
          <div className="reviews-summary">
            <span className="google-attribution" translate="no">Google Maps</span>
            {data.rating !== undefined && <strong>{number.format(data.rating)} <span>/ 5</span></strong>}
            <p>{number.format(data.userRatingCount)} {data.userRatingCount === 1 ? "valoración" : "valoraciones"}</p>
            <a className="review-link" href={data.googleMapsUri ?? restaurantMapsUrl}>Ver ficha <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
          <div className="reviews-results">
            <div className="reviews-grid">
              {data.reviews.map(review => <ReviewCard key={review.name} review={review} />)}
            </div>
            {data.reviews.length > 0 && <p className="reviews-order">Google Maps ordena las reseñas por relevancia. <a href="https://support.google.com/contributionpolicy/answer/7400114">Política de reseñas</a></p>}
            {data.attributions.map(({ provider, providerUri }) => (
              <small className="reviews-order" key={provider}>{providerUri ? <a href={providerUri}>{provider}</a> : provider}</small>
            ))}
          </div>
        </div>
      )}
      <div className="review-policies">
        <details>
          <summary>Términos de uso de las reseñas</summary>
          <p>Al consultar las reseñas se aplican los <a href="https://www.google.com/intl/es/help/terms_maps/">Términos de Google Maps</a> y los <a href="https://policies.google.com/terms?hl=es">Términos del Servicio de Google</a>.</p>
        </details>
        <details>
          <summary>Privacidad de las reseñas</summary>
          <p>La Posada solicita las reseñas a Google Maps en el momento de la consulta y no guarda los comentarios. Los avatares se cargan desde Google, que aplica su <a href="https://policies.google.com/privacy?hl=es">Política de Privacidad</a>.</p>
        </details>
      </div>
    </div>
  );
}
