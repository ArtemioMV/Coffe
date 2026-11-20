import Link from "next/link";
import { Compass, UtensilsCrossed } from "lucide-react";
import { Button } from "@restaurant/ui";

export default function NotFound() {
  return (
    <div className="page-shell narrow" style={{ textAlign: "center" }}>
      <div style={{ width: "72px", height: "72px", display: "grid", placeItems: "center", margin: "0 auto 1.5rem" }}>
        <Compass size={36} />
      </div>
      <span className="eyebrow">PARECE QUE NOS DESVIAMOS DEL CAMINO</span>
      <h1 style={{ marginBottom: "0.8rem" }}>
        No encontramos esta página
      </h1>
      <p style={{ maxWidth: "460px", margin: "0 auto 2rem" }}>
        La ruta que buscas no existe o ha sido movida. Pero no te preocupes, la mesa sigue servida esperándote.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Button asChild className="button-primary">
          <Link href="/carta">
            <UtensilsCrossed size={17} /> Volver a nuestra carta
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
