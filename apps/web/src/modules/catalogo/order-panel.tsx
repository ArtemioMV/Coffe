"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { QrCode, ShoppingBag, Trash2 } from "lucide-react";
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
  onChange,
  onNote,
  checkout
}: Props) {
  const [reviewing, setReviewing] = useState(false);

  return (
    <aside className="order-panel" id="pedido-panel" aria-label="Tu pedido" tabIndex={-1}>
      <div className="order-panel-head">
        <h2>Tu pedido</h2>
        {count > 0 && (
          <span className="order-count">
            {count} {count === 1 ? "plato" : "platos"}
          </span>
        )}
      </div>

      {!items.length ? (
        <div className="order-empty">
          <ShoppingBag aria-hidden />
          <p>Aún no agregas platos.</p>
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

          {canOrder && (
            reviewing ? (
              checkout
            ) : (
              <Button
                className="full-width button-primary"
                disabled={busy}
                onClick={() => setReviewing(true)}
              >
                Revisar pedido
              </Button>
            )
          )}
          {!hasTable && (
            <Link className="site-text-link order-qr-link" href="/#como-pedir">
              <QrCode aria-hidden /> Escanea el QR de tu mesa para pedir
            </Link>
          )}
        </>
      )}
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
        <button
          type="button"
          className="order-remove"
          aria-label={`Retirar ${name} del pedido`}
          title="Retirar del pedido"
          disabled={busy}
          onClick={event => {
            if (event.detail === 0) event.currentTarget.closest<HTMLElement>(".order-panel")?.focus({ preventScroll: true });
            onChange(item.productId, -item.quantity);
          }}
        >
          <Trash2 aria-hidden />
        </button>
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
