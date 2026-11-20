import { useState, type ReactNode } from "react";
import { Armchair, CheckCircle2, ClipboardList, CookingPot, Search, Utensils } from "lucide-react";
import type { Order } from "@/lib/client";

const stages = [
  { status: "PENDING", title: "Nuevos", icon: ClipboardList },
  { status: "PREPARING", title: "En preparación", icon: CookingPot },
  { status: "READY", title: "Listos", icon: CheckCircle2 },
  { status: "DELIVERED", title: "Entregados", icon: Utensils },
] as const;

export function KitchenBoard({ orders, renderOrder }: {
  orders: Order[];
  renderOrder: (order: Order) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().replace(/^#/, "").toLocaleLowerCase("es");
  const visible = orders.filter(o => `${o.accountNumber} ${o.number} mesa ${o.tableName}`.toLocaleLowerCase("es").includes(query));
  const active = orders.filter(o => o.status !== "DELIVERED");
  const tables = new Set(active.map(o => o.attentionId).filter(Boolean)).size;
  const columns = stages.map(stage => ({
    ...stage,
    orders: visible.filter(order => order.status === stage.status),
  }));

  return (
    <>
      <div className="kitchen-overview">
        <div><ClipboardList aria-hidden size={20} /><strong>{active.length}</strong> Comandas activas</div>
        <div><Armchair aria-hidden size={20} /><strong>{tables}</strong> Mesas con comandas activas</div>
        <label className="search-field kitchen-search">
          <Search size={17} aria-hidden />
          <span className="sr-only">Buscar pedido por número o mesa</span>
          <input type="search" placeholder="Buscar pedido o mesa" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="posada-weave kitchen-divider" aria-hidden />
      <div className="kitchen-board" aria-label="Comandas por etapa">
        {columns.map(({ status, title, icon: Icon, orders: entries }) => (
          <section key={status} className="kitchen-lane" data-stage={status} aria-labelledby={`cocina-${status}`}>
            <header className="kitchen-lane-header">
              <Icon size={19} aria-hidden />
              <h2 id={`cocina-${status}`}>{title}</h2>
              <span className="kitchen-count" aria-label={`${entries.length} pedidos`}>{entries.length}</span>
            </header>
            {status === "DELIVERED" && <p className="kitchen-history-note">De mesas con atención abierta</p>}
            <div className="kitchen-lane-orders">
              {entries.length ? entries.map(renderOrder) : <p className="kitchen-empty">Sin pedidos en esta etapa</p>}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
