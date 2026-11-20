"use client";
import { useState } from "react";
import { Button } from "@restaurant/ui";

type Props = { staff?: boolean; busy: boolean; onSubmit: (data: { guestName: string; notes: string }) => void; onEdit: () => void };

/** Último paso antes de enviar: nombre opcional y observaciones para la mesa. */
export function CheckoutForm({ staff = false, busy, onSubmit, onEdit }: Props) {
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="checkout-form"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ guestName, notes });
      }}
    >
      <label>
        {staff ? "Nombre del cliente (opcional)" : "Tu nombre (opcional)"}
        <input
          maxLength={80}
          value={guestName}
          disabled={busy}
          placeholder="¿A nombre de quién?"
          onChange={e => {
            setGuestName(e.target.value);
            onEdit();
          }}
        />
      </label>
      <label>
        Observaciones para la mesa
        <textarea
          maxLength={500}
          value={notes}
          disabled={busy}
          placeholder="Ej.: traer todo junto"
          onChange={e => {
            setNotes(e.target.value);
            onEdit();
          }}
        />
      </label>
      <Button className="full-width" disabled={busy}>
        {busy ? "Enviando…" : staff ? "Enviar a cocina" : "Enviar al mozo"}
      </Button>
    </form>
  );
}
