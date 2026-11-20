"use client";
import { useEffect, useRef, useState } from "react";
import { cents } from "@restaurant/contracts";
import type { Product } from "@/lib/client";

export type CartLine = { productId: string; quantity: number; notes: string };
export type CartItem = CartLine & { product: Product };

export const MAX_QUANTITY = 30;
const MAX_NOTE = 200;

function readStored(storageKey: string): CartLine[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((i: CartLine) => typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= MAX_QUANTITY)
      .map((i: CartLine) => ({ productId: i.productId, quantity: i.quantity, notes: typeof i.notes === "string" ? i.notes.slice(0, MAX_NOTE) : "" }));
  } catch {
    return [];
  }
}

/** Carrito de la mesa guardado en el navegador. Cada cambio invalida la clave idempotente del envío. */
export function useCart(storageKey: string, products: Product[]) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const idempotencyKey = useRef("");

  useEffect(() => {
    setCart(readStored(storageKey));
  }, [storageKey]);

  function save(next: CartLine[]) {
    setCart(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
    idempotencyKey.current = "";
  }

  function change(productId: string, delta: number) {
    const current = cart.find(i => i.productId === productId);
    if (!current) {
      if (delta > 0) save([...cart, { productId, quantity: 1, notes: "" }]);
      return;
    }
    save(
      cart
        .map(i => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + delta) } : i))
        .filter(i => i.quantity > 0),
    );
  }

  function setNote(productId: string, notes: string) {
    save(cart.map(i => (i.productId === productId ? { ...i, notes: notes.slice(0, MAX_NOTE) } : i)));
  }

  function clear() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setCart([]);
  }

  const items: CartItem[] = cart
    .map(line => ({ ...line, product: products.find(p => p.id === line.productId) }))
    .filter((i): i is CartItem => !!i.product);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + cents(i.product.price) * i.quantity, 0) / 100;
  const quantityOf = (productId: string) => cart.find(i => i.productId === productId)?.quantity ?? 0;

  return { items, count, total, quantityOf, change, setNote, clear, idempotencyKey };
}
