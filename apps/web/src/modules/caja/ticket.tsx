"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@restaurant/ui";
import { money } from "@restaurant/contracts";
import { dateTime, Order } from "@/lib/client";

export type TicketData = {
  order: Order;
  business: { name: string; ruc: string; address: string };
  payments: { amount: string; method: string }[];
};

/** Vista de impresión. Los datos llegan ya resueltos desde el servidor (page.tsx). */
export function Ticket({ data = null, error = "", type: initialType }: { data?: TicketData | null; error?: string; type: string }) {
  const router = useRouter();
  const [type, setType] = useState(initialType);
  // Vuelve a donde estaba (pedidos o la mesa); si se abrió directo, al panel.
  const back = () => (history.length > 1 ? router.back() : router.push("/panel"));

  return (
    <div className="page-shell">
      <div className="print-controls" style={{ maxWidth: "600px", margin: "0 auto 2rem", padding: "1.5rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>
          Imprimir {type}
        </h1>
        <label>
          Tipo de documento
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="precuenta">Precuenta para la mesa</option>
            <option value="comanda">Comanda interna de cocina</option>
            <option value="ticket">Ticket interno de pago</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <Button variant="outline" onClick={back}>
            <ArrowLeft size={16} aria-hidden /> Volver
          </Button>
          <Button onClick={() => window.print()} disabled={!data} className="button-primary">
            <Printer size={16} aria-hidden /> Imprimir documento
          </Button>
        </div>
        <p className="small-note">
          Compatible con el diálogo de impresión del navegador. Ajusta papel térmico de 80 mm en tu impresora.
        </p>
      </div>

      {error && <p role="alert" className="error-banner">{error}</p>}

      {data && (
        <article className="thermal-ticket">
          <h2>{data.business.name || "La Posada Cajamarquina"}</h2>
          {data.business.ruc && <p>RUC {data.business.ruc}</p>}
          {data.business.address && <p>{data.business.address}</p>}
          <h3 style={{ margin: "8px 0", padding: "4px 0" }}>
            {type.toUpperCase()}
          </h3>
          <p>
            Pedido #{data.order.number} · Mesa {data.order.tableName}<br />
            {dateTime(data.order.createdAt)}
          </p>

          <div style={{ padding: "6px 0", margin: "6px 0" }}>
            {data.order.items.map(i => (
              <div className="receipt-line" key={i.id} style={{ padding: "4px 0" }}>
                <div>
                  {i.quantity} × {i.name}
                  {i.notes && <small style={{ display: "block", fontStyle: "italic" }}>*{i.notes}</small>}
                </div>
                {type !== "comanda" && <span>{money(Number(i.price) * i.quantity)}</span>}
              </div>
            ))}
          </div>

          {data.order.notes && <p style={{ fontStyle: "italic" }}>Nota: {data.order.notes}</p>}

          {type !== "comanda" && (
            <>
              <div className="cart-total" style={{ margin: "8px 0", paddingTop: "4px" }}>
                <strong>TOTAL</strong>
                <strong>{money(data.order.total)}</strong>
              </div>
              {data.payments.map((p, i) => (
                <p key={i} style={{ margin: "2px 0" }}>{p.method}: {money(p.amount)}</p>
              ))}
              <p>
                Saldo: {money(Number(data.order.total) - Number(data.order.paid))}
              </p>
            </>
          )}

          <p className="ticket-disclaimer">
            Documento de control interno.<br />
            No es boleta ni factura electrónica.
          </p>
          <p style={{ marginTop: "8px", textAlign: "center" }}>
            ¡Gracias por compartir nuestra mesa!
          </p>
        </article>
      )}
    </div>
  );
}
