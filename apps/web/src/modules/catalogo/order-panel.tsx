"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { QrCode, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@restaurant/ui";
import { money, cents } from "@restaurant/contracts";
import type { CartItem } from "./use-cart";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  items: CartItem[];
  count: number;
  total: number;
  busy: boolean;
  canOrder: boolean;
  hasTable: boolean;
  /** El mozo de la mesa toma el pedido: no hay paso de confirmación, va directo a cocina. */
  staff?: boolean;
  onChange: (productId: string, delta: number) => void;
  onNote: (productId: string, notes: string) => void;
  checkout: ReactNode;
};

/** Panel «Tu pedido»: líneas con cantidad, indicación opcional, total y paso a confirmación. */
export function OrderPanel({
  items,
  count,
  total,
  busy,
  canOrder,
  hasTable,
  staff = false,
  onChange,
  onNote,
  checkout
}: Props) {
  const [reviewing, setReviewing] = useState(false);

  return (
    <aside className="order-panel" id="pedido-panel" aria-label="Tu pedido">
      <div className="order-panel-head">
        <h2>Tu pedido</h2>
        {count > 0 && (
          <span className="badge" style={{ background: "var(--gold-light)", color: "var(--gold-deep)", fontWeight: 700 }}>
            {count} {count === 1 ? "plato" : "platos"}
          </span>
        )}
      </div>

      {!items.length ? (
        <div className="order-empty">
          <ShoppingBag aria-hidden />
          <p>Aún no agregas platos.</p>
          <small style={{ color: "var(--muted)", display: "block", marginTop: "0.25rem" }}>
            Elige tus platos favoritos de la carta para calcular tu cuenta.
          </small>
        </div>
      ) : (
        <>
          <ul className="order-lines">
            {items.map(item => (
              <OrderLine
                key={item.productId}
                item={item}
                busy={busy}
                onChange={onChange}
                onNote={onNote}
              />
            ))}
          </ul>

          <div className="order-total">
            <span>Total estimado</span>
            <strong>{money(total)}</strong>
          </div>

          {hasTable ? (
            reviewing && canOrder ? (
              checkout
            ) : (
              <Button
                className="full-width button-primary"
                disabled={!canOrder || busy}
                onClick={() => setReviewing(true)}
              >
                Revisar pedido
              </Button>
            )
          ) : (
            <div style={{ marginTop: "0.8rem" }}>
              <Button asChild variant="outline" className="full-width">
                <Link href="/#como-pedir">
                  <QrCode size={16} aria-hidden /> Escanear QR en mesa para pedir
                </Link>
              </Button>
            </div>
          )}
        </>
      )}

      <p className="small-note" style={{ borderTop: "1px solid var(--line)", paddingTop: "0.6rem", marginTop: "0.8rem" }}>
        {hasTable ? (
          staff
            ? "Estás tomando el pedido de la mesa: al enviarlo llega directo a cocina."
            : "Tu mozo confirmará el pedido antes de enviarlo a cocina."
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <Sparkles size={14} color="var(--gold-deep)" aria-hidden />
            Para pedir en el restaurante, escanea el QR de tu mesa.
          </span>
        )}
      </p>
    </aside>
  );
}

function OrderLine({
  item,
  busy,
  onChange,
  onNote
}: {
  item: CartItem;
  busy: boolean;
  onChange: Props["onChange"];
  onNote: Props["onNote"];
}) {
  const [editing, setEditing] = useState(Boolean(item.notes));
  const name = item.product.name;
  const noteId = `nota-${item.productId}`;

  return (
    <li className="order-line">
      <div className="order-line-top">
        <strong>{name}</strong>
        <span>{money((cents(item.product.price) * item.quantity) / 100)}</span>
      </div>
      <div className="order-line-actions">
        <QuantityStepper
          name={name}
          quantity={item.quantity}
          disabled={busy}
          onChange={delta => onChange(item.productId, delta)}
        />
        {!editing && (
          <button type="button" className="text-link" onClick={() => setEditing(true)}>
            Añadir indicación
          </button>
        )}
      </div>
      {editing && (
        <>
          <label className="sr-only" htmlFor={noteId}>
            Indicación para {name}
          </label>
          <input
            id={noteId}
            className="item-note"
            placeholder="Ej.: sin picante"
            maxLength={200}
            value={item.notes}
            disabled={busy}
            autoFocus={!item.notes}
            onChange={e => onNote(item.productId, e.target.value)}
            onBlur={() => !item.notes && setEditing(false)}
          />
        </>
      )}
    </li>
  );
}
