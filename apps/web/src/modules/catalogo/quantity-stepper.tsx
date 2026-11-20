"use client";
import { Minus, Plus } from "lucide-react";
import { MAX_QUANTITY } from "./use-cart";

type Props = { name: string; quantity: number; disabled?: boolean; onChange: (delta: number) => void };

export function QuantityStepper({ name, quantity, disabled, onChange }: Props) {
  return (
    <div className="stepper" role="group" aria-label={`Cantidad de ${name}`}>
      <button type="button" aria-label={`Quitar uno de ${name}`} disabled={disabled} onClick={() => onChange(-1)}>
        <Minus aria-hidden />
      </button>
      <span aria-live="polite">{quantity}</span>
      <button
        type="button"
        aria-label={`Sumar uno de ${name}`}
        disabled={disabled || quantity >= MAX_QUANTITY}
        onClick={() => onChange(1)}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
