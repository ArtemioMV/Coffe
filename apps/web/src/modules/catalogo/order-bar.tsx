"use client";
import { useEffect, useState } from "react";
import { money } from "@restaurant/contracts";

/** Barra fija en móvil que lleva al panel del pedido; se oculta cuando el panel ya está a la vista. */
export function OrderBar({ count, total, target }: { count: number; total: number; target: string }) {
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const panel = document.getElementById(target);
    if (!panel || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [target]);

  if (!count || panelVisible) return null;
  return (
    <a href={`#${target}`} className="order-bar">
      <span>Ver mi pedido · {count} {count === 1 ? "producto" : "productos"}</span>
      <strong>{money(total)}</strong>
    </a>
  );
}
