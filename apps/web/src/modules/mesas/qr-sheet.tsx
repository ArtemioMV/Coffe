"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";
import { Button } from "@restaurant/ui";
import { api, Table } from "@/lib/client";
import { brandLogo, brandName } from "@/lib/brand";

export function QrSheet({ id }: { id: string }) {
  const [table, setTable] = useState<Table | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const back = () => (history.length > 1 ? router.back() : router.push(`/panel?vista=tables&mesa=${id}`));

  useEffect(() => {
    api<{ tables: Table[] }>("tables")
      .then(r => {
        const found = r.tables.find(t => t.id === id);
        if (!found) throw new Error("Mesa no encontrada");
        setTable(found);
      })
      .catch(e => setError(e.message));
  }, [id]);

  return (
    <div className="page-shell">
      <div className="print-controls" style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <Button variant="outline" onClick={back}>
          <ArrowLeft size={16} aria-hidden /> Volver
        </Button>
        <Button onClick={() => window.print()} disabled={!table} className="button-primary">
          <Printer size={16} aria-hidden /> Imprimir QR para mesa
        </Button>
      </div>

      {error && <p role="alert" className="error-banner">{error}</p>}

      {table && (
        <article className="qr-print" style={{ textAlign: "center", maxWidth: "560px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <Image src={brandLogo} width={90} height={90} alt="" />
          </div>
          <span className="eyebrow">BIENVENIDO A NUESTRA CASA</span>
          <h1 style={{ margin: "0.2rem 0" }}>Mesa {table.name}</h1>
          <p>{table.zone}</p>
          
          <div style={{ padding: "1.5rem", display: "inline-block", margin: "1.2rem auto" }}>
            <img
              src={`/api/v1/tables/${id}/qr`}
              width={260}
              height={260}
              alt={`QR de mesa ${table.name}`}
              style={{ display: "block" }}
            />
          </div>

          <h2 style={{ margin: "1rem 0 0.5rem" }}>
            Tu próximo buen momento empieza aquí.
          </h2>
          <p style={{ maxWidth: "420px", margin: "0 auto" }}>
            Apunta la cámara de tu teléfono al código para ver nuestra carta y pedir.
            Tu mozo revisará tu pedido antes de enviarlo a cocina.
          </p>

          <div style={{ marginTop: "2rem", paddingTop: "1rem", display: "flex", justifyContent: "center", gap: "0.4rem" }}>
            <Sparkles size={16} /> {brandName} · ¡Aquishito es pue!
          </div>
        </article>
      )}
    </div>
  );
}
