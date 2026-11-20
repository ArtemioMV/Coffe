import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  MapPin,
  Navigation,
  QrCode,
  Sparkles,
  UtensilsCrossed
} from "lucide-react";
import { Button } from "@restaurant/ui";
import { Carousel } from "@/modules/inicio/carousel";
import { Experiences } from "@/modules/inicio/experiences";
import { Reviews } from "@/modules/inicio/reviews";
import { restaurantDirectionsUrl, restaurantLocality, restaurantMapEmbedUrl, restaurantWazeUrl } from "@/modules/inicio/location";
import { SocialSection } from "@/modules/social/social-section";
import { slides } from "@/modules/inicio/slides";
import { brandName } from "@/lib/brand";

export default function Home() {
  return (
    <>
      {/* Carrusel de bienvenida automático */}
      <Carousel slides={slides} />

      {/* Pasos para pedir: sutiles, círculos elegantes con flechas conectoras */}
      <section id="como-pedir" className="posada-section steps-section">
        <div className="section-header">
          <span className="eyebrow">CÓMO FUNCIONA · DESDE TU TELÉFONO</span>
          <h2>Pide desde tu mesa en 3 pasos</h2>
          <p>Sin demoras ni esperas: tienes todo el control para ordenar calientito.</p>
        </div>

        <div className="steps-flow">
          {/* Paso 1 */}
          <div className="step-item">
            <div className="step-circle">
              <QrCode size={22} aria-hidden />
              <span className="step-number">1</span>
            </div>
            <h3>Escanea el QR</h3>
            <p>Apunta con la cámara de tu celular al código ubicado en tu mesa.</p>
          </div>

          <div className="step-arrow" aria-hidden="true">
            <ArrowRight size={22} />
          </div>

          {/* Paso 2 */}
          <div className="step-item">
            <div className="step-circle">
              <UtensilsCrossed size={22} aria-hidden />
              <span className="step-number">2</span>
            </div>
            <h3>Elige tus platos</h3>
            <p>Arma tu orden a tu gusto, agrega detalles como «sin picante» y envía.</p>
          </div>

          <div className="step-arrow" aria-hidden="true">
            <ArrowRight size={22} />
          </div>

          {/* Paso 3 */}
          <div className="step-item">
            <div className="step-circle">
              <Sparkles size={22} aria-hidden />
              <span className="step-number">3</span>
            </div>
            <h3>Tu mozo te atiende</h3>
            <p>El mozo confirma el pedido y cocina lo prepara al momento.</p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.8rem" }}>
          <Button asChild className="button-primary">
            <Link href="/carta">
              <UtensilsCrossed size={16} aria-hidden /> Explorar la carta completa
            </Link>
          </Button>
        </div>
      </section>

      <div className="woven-divider" aria-hidden="true"><span /></div>
      <Experiences />
      <Reviews />

      {/* Ubícanos con Google Maps */}
      <section className="posada-section map-section">
        <div className="section-header">
          <h2>Ubícanos</h2>
        </div>

        <div className="map-layout">
          <div className="map-info">
            <div>
              <strong>{brandName}</strong>
              <p>{restaurantLocality}</p>
            </div>
            <div className="map-directions">
              <Button asChild variant="outline"><a href={restaurantDirectionsUrl}><MapPin size={18} aria-hidden /> Google Maps</a></Button>
              <Button asChild variant="outline"><a href={restaurantWazeUrl}><Navigation size={18} aria-hidden /> Waze</a></Button>
            </div>
          </div>

          <div className="map-frame-wrap">
            <iframe
              title={`Ubicación de ${brandName} en Google Maps`}
              src={restaurantMapEmbedUrl}
              width="100%"
              height="340"
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </section>
      <Suspense fallback={null}><SocialSection /></Suspense>
    </>
  );
}
