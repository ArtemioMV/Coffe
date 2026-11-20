import Link from "next/link";
import { ExternalLink, MessageSquareQuote } from "lucide-react";
import { googleReviewsEnabled } from "./google-reviews";
import { GoogleReviewsPanel } from "./google-reviews-panel";
import { featuredReviewUrl, restaurantMapsUrl } from "./location";

export function Reviews() {
  return (
    <section className="posada-section reviews-section" aria-labelledby="reviews-title">
      <div className="section-header">
        <h2 id="reviews-title">Opiniones de nuestros clientes</h2>
      </div>
      <a className="featured-review" href={featuredReviewUrl}>
        <MessageSquareQuote size={20} strokeWidth={1.6} aria-hidden />
        Ver reseña compartida en Google Maps
        <ExternalLink size={14} aria-hidden />
      </a>
      {googleReviewsEnabled() ? <GoogleReviewsPanel /> : (
        <div className="reviews-empty">
          <a className="review-link" href={restaurantMapsUrl}>Ver opiniones en Google Maps <ExternalLink size={13} aria-hidden="true" /></a>
          <Link className="review-link" href="/sugerencias">Comparte tu experiencia</Link>
        </div>
      )}
    </section>
  );
}
