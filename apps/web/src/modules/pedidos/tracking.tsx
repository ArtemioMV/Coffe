"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CookingPot,
  Sparkles,
  UtensilsCrossed,
  Check,
  Star,
  MapPin,
  Flame
} from "lucide-react";
import { Button } from "@restaurant/ui";
import { money, statusLabels } from "@restaurant/contracts";
import { api, mutation, Order, dateTime } from "@/lib/client";

const STEPS = [
  { key: "AWAITING_WAITER", label: "Por confirmar", icon: Clock3 },
  { key: "PENDING", label: "En cocina", icon: UtensilsCrossed },
  { key: "PREPARING", label: "En preparación", icon: Flame },
  { key: "READY", label: "Listo", icon: Sparkles },
  { key: "DELIVERED", label: "Entregado", icon: CheckCircle2 }
];

function getStepIndex(status: string) {
  const index = STEPS.findIndex(s => s.key === status);
  return index === -1 ? 0 : index;
}

export function Tracking({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [access, setAccess] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hoverRating, setHoverRating] = useState(5);

  useEffect(() => {
    const token = location.hash.slice(1) || sessionStorage.getItem(`order:${id}`) || "";
    if (token) {
      sessionStorage.setItem(`order:${id}`, token);
      setAccess(token);
      history.replaceState(null, "", location.pathname);
    }
    let active = true;
    const load = () =>
      api<{ order: Order }>(`orders/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(r => {
          if (active) {
            setOrder(r.order);
            setError("");
          }
        })
        .catch(e => {
          if (active) setError(e.message);
        });

    void load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  async function rate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await mutation(
        `orders/${id}/rating`,
        { score: Number(form.get("score")), comment: form.get("comment") },
        "POST",
        access ? { Authorization: `Bearer ${access}` } : {}
      );
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const currentIndex = order ? getStepIndex(order.status) : 0;

  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <span className="eyebrow">ESTAMOS CONTIGO · SEGUIMIENTO EN VIVO</span>
        <h1>{order ? `Pedido #${order.accountNumber}${order.round > 1 ? ` · comanda ${order.round}` : ""}` : "Tu pedido"}</h1>
        <p>Consulta aquí cómo va tu preparación. Actualizamos este seguimiento automáticamente.</p>
      </div>

      {error && <p className="error-banner" role="alert">{error}</p>}

      {order && (
        <>
          {/* Tarjeta de estado principal */}
          <section className="surface tracking-card">
            {/* Stepper visual con los 5 estados */}
            {!["CANCELLED", "REJECTED"].includes(order.status) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", margin: "1rem 0 2rem", padding: "0 0.5rem" }}>
                <div style={{ position: "absolute", top: "18px", left: "10%", right: "10%", height: "4px", zIndex: 0 }} />
                <div
                  style={{ position: "absolute", top: "18px", left: "10%", width: `${(currentIndex / (STEPS.length - 1)) * 80}%`, height: "4px", zIndex: 0, transition: "width 0.4s ease" }}
                />

                {STEPS.map((s, idx) => {
                  const Icon = s.icon;
                  const isDone = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;
                  return (
                    <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                      <div
                        style={{ width: "36px", height: "36px", display: "grid", placeItems: "center", transition: "all 0.3s ease" }}
                      >
                        <Icon size={17} />
                      </div>
                      <span style={{ marginTop: "0.35rem" }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Clock3 size={34} aria-hidden />
            
            {/* Este h2 es exactamente el que busca el test (ej: "Por confirmar" o "Entregado") */}
            <h2>{statusLabels[order.status]}</h2>

            <p style={{ maxWidth: "460px", margin: "0 auto 1.2rem" }}>
              {order.status === "AWAITING_WAITER"
                ? "Tu mozo revisará el pedido antes de enviarlo a cocina."
                : order.status === "PENDING"
                ? "El pedido fue confirmado y comanda enviada a cocina/barra."
                : order.status === "PREPARING"
                ? "Nuestros cocineros están preparando tus platos al fuego."
                : order.status === "READY"
                ? "Tu pedido está listo. El mozo ya tiene el aviso para recogerlo."
                : order.status === "DELIVERED"
                ? "¡Entregado a tu mesa! Esperamos que disfrutes de cada bocado."
                : "Actualizamos este seguimiento automáticamente."}
            </p>

            <div style={{ display: "inline-flex", gap: "0.6rem", alignItems: "center" }}>
              <span className="badge">
                Mesa {order.tableName}
              </span>
              <span className="badge">
                {order.guestName ? `Cliente: ${order.guestName}` : "Pedido de mesa"}
              </span>
            </div>

            <p className="small-note" style={{ marginTop: "1rem" }}>
              Registrado el {dateTime(order.createdAt)}
            </p>
          </section>

          {/* Resumen del Pedido */}
          <section className="surface">
            <h2 style={{ marginBottom: "1rem" }}>Lo que elegiste</h2>
            {order.items.map(i => (
              <div className="receipt-line" key={i.id}>
                <div>
                  <strong>{i.quantity} × {i.name}</strong>
                  {i.notes && <small style={{ marginTop: "0.2rem" }}>Nota: {i.notes}</small>}
                </div>
                <strong>{money(Number(i.price) * i.quantity)}</strong>
              </div>
            ))}

            {order.notes && (
              <div style={{ padding: "0.65rem 0.9rem", margin: "1rem 0" }}>
                <strong style={{ display: "block" }}>Observaciones generales:</strong>
                <p style={{ margin: "0.2rem 0 0" }}>{order.notes}</p>
              </div>
            )}

            <div className="cart-total">
              <span>Total del pedido</span>
              <strong>{money(order.total)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem" }}>
              <span>Pagado hasta ahora:</span>
              <span>
                {money(order.paid)}
              </span>
            </div>
          </section>

          {/* Valoración tras entrega */}
          {order.status === "DELIVERED" && (
            <section className="surface">
              <h2 style={{ marginBottom: "0.6rem" }}>
                ¿Cómo estuvo tu experiencia?
              </h2>
              {saved ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "1rem 1.4rem" }}>
                  <CheckCircle2 size={24} />
                  <span>Gracias por compartir tu valoración.</span>
                </div>
              ) : (
                <form onSubmit={rate}>
                  <p style={{ marginBottom: "1.2rem" }}>
                    Tu opinión nos ayuda a mantener viva la auténtica sazón campestre.
                  </p>

                  <label>
                    Tu valoración
                    <select name="score" defaultValue="5">
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "estrella (A mejorar)" : n === 5 ? "estrellas (¡Excelente!)" : "estrellas"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cuéntanos (opcional)
                    <textarea
                      name="comment"
                      maxLength={1000}
                      placeholder="¿Qué tal estuvo el sabor, la temperatura y la atención de tu mozo?"
                    />
                  </label>

                  <Button className="button-primary" disabled={busy}>
                    {busy ? "Enviando…" : "Enviar valoración"}
                  </Button>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
