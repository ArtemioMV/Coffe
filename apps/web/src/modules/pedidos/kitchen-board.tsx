import type { ReactNode } from "react";
import { CheckCircle2, ClipboardList, CookingPot } from "lucide-react";
import type { Order } from "@/lib/client";

const stages = [
  { status: "PENDING", title: "Nuevos", icon: ClipboardList },
  { status: "PREPARING", title: "En preparación", icon: CookingPot },
  { status: "READY", title: "Listos", icon: CheckCircle2 },
] as const;

export function KitchenBoard({ orders, renderOrder }: {
  orders: Order[];
  renderOrder: (order: Order) => ReactNode;
}) {
  const columns = stages.map(stage => ({
    ...stage,
    orders: orders.filter(order => order.status === stage.status),
  }));

  return (
    <div className="kitchen-board" aria-label="Comandas por etapa">
      {columns.map(({ status, title, icon: Icon, orders: entries }) => (
        <section key={status} className="kitchen-lane" aria-labelledby={`cocina-${status}`}>
          <header className="kitchen-lane-header">
            <Icon size={19} aria-hidden />
            <h2 id={`cocina-${status}`}>{title}</h2>
            <span className="kitchen-count" aria-label={`${entries.length} pedidos`}>{entries.length}</span>
          </header>
          <div className="kitchen-lane-orders">
            {entries.length ? entries.map(renderOrder) : <p className="kitchen-empty">Sin pedidos en esta etapa</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
