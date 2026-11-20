"use client";
import { Plus, UtensilsCrossed, Wine } from "lucide-react";
import { Button } from "@restaurant/ui";
import { money } from "@restaurant/contracts";
import type { Product } from "@/lib/client";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  product: Product;
  quantity: number;
  disabled?: boolean;
  onChange: (delta: number) => void;
};

/** Fila de plato: nombre, icono de estación y descripción a la izquierda; precio y botón Agregar (o cantidad) a la derecha. */
export function ProductRow({ product, quantity, disabled, onChange }: Props) {
  const isBar = product.station === "BAR";

  return (
    <article className={quantity ? "product-row selected" : "product-row"}>
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
        ) : quantity ? (
          <QuantityStepper
            name={product.name}
            quantity={quantity}
            disabled={disabled}
            onChange={onChange}
          />
        ) : (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(1)}
            aria-label={`Agregar ${product.name}`}
          >
            <Plus aria-hidden /> Agregar
          </Button>
        )}
      </div>
    </article>
  );
}
