"use client";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@restaurant/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell narrow" style={{ textAlign: "center" }}>
      <div style={{ width: "72px", height: "72px", display: "grid", placeItems: "center", margin: "0 auto 1.5rem" }}>
        <AlertTriangle size={36} />
      </div>
      <span className="eyebrow">HUBO UN INCONVENIENTE TÉCNICO</span>
      <h1 style={{ marginBottom: "0.8rem" }}>
        No pudimos cargar esta página
      </h1>
      <p style={{ maxWidth: "460px", margin: "0 auto 2rem" }}>
        Revisa tu conexión a internet o intenta recargar. Si el problema persiste, solicita asistencia a tu mozo en el local.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Button onClick={reset} className="button-primary">
          <RotateCcw size={17} /> Volver a intentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
