"use client";
import { Plus, UtensilsCrossed, Wine } from "lucide-react";
import { Button } from "@restaurant/ui";
import { money } from "@restaurant/contracts";
import type { Product } from "@/lib/client";

type Props = {
  product: Product;
  added: boolean;
  disabled?: boolean;
  onAdd: () => void;
};

export function ProductRow({ product, added, disabled, onAdd }: Props) {
  const isBar = product.station === "BAR";

  return (
    <article className="product-row" tabIndex={-1}>
      <div className="product-info">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
          {isBar ? (
            <span title="Bebida de barra" style={{ color: "var(--green)", display: "inline-flex" }}>
              <Wine size={15} aria-hidden />
            </span>
          ) : (
            <span title="Plato de cocina" style={{ color: "var(--carmine)", display: "inline-flex" }}>
              <UtensilsCrossed size={15} aria-hidden />
            </span>
          )}
          <h3>{product.name}</h3>
        </div>
        {product.description && <p>{product.description}</p>}
      </div>

      <div className="product-buy">
        <strong>{money(product.price)}</strong>
        {!product.available ? (
          <span className="badge">Agotado</span>
        ) : !added && (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={event => {
              event.currentTarget.closest("article")?.focus({ preventScroll: true });
              onAdd();
            }}
            aria-label={`Agregar ${product.name}`}
          >
            <Plus aria-hidden /> Agregar
          </Button>
        )}
      </div>
    </article>
  );
}
