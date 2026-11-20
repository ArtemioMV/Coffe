import Image from "next/image";
import Link from "next/link";
import { BookOpenText, MapPin } from "lucide-react";
import { brandLogo, brandName } from "@/lib/brand";
import { business } from "@/lib/env";
import { restaurantLocality } from "@/modules/inicio/location";

export function SiteFooter() {
  // Solo datos configurados en .env (BUSINESS_*): nada se inventa en el pie.
  const { name, ruc, address } = business();
  return (
    <footer className="site-footer">
      <div className="posada-weave" aria-hidden="true" />
      <div className="footer-grid">
        <div className="footer-brand">
          <Image src={brandLogo} width={56} height={56} alt="" />
          <div>
            <strong>{brandName}</strong>
            <p>Restaurante campestre de cocina cajamarquina.</p>
            <p className="footer-place"><MapPin aria-hidden /> {address || restaurantLocality}</p>
          </div>
        </div>

        <nav aria-label="Nuestra casa" className="footer-links">
          <h2>Nuestra casa</h2>
          <Link href="/carta">Carta</Link>
          <Link href="/#como-pedir">Cómo pedir desde la mesa</Link>
          <Link href="/sugerencias">Sugerencias y valoraciones</Link>
        </nav>

        <nav aria-label="Atención al consumidor" className="footer-links">
          <h2>Atención al consumidor</h2>
          <Link href="/libro-de-reclamaciones" className="site-text-link">
            <BookOpenText aria-hidden /> Libro de Reclamaciones
          </Link>
          <Link href="/panel">Acceso del personal</Link>
        </nav>
      </div>
      <div className="footer-legal">
        <small>© {new Date().getFullYear()} {name || brandName}</small>
        {ruc && <small>RUC {ruc}</small>}
      </div>
    </footer>
  );
}
