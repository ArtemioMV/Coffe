"use client";
import { useState } from "react";
import Link from "next/link";
import { Armchair, ClipboardList, Users } from "lucide-react";
import { Button } from "@restaurant/ui";
import { dateTime, mutation, type Order, type Table, type User } from "@/lib/client";
import { cents, money, statusLabels } from "@restaurant/contracts";
import { DisclosureSummary } from "@/components/disclosure-summary";

type Run = (task: () => Promise<unknown>) => Promise<void>;
type Props = { tables: Table[]; orders: Order[]; user: User; run: Run; busy: boolean; initialTableId?: string | null; onSelect?: (id: string) => void };

type State = "libre" | "atencion" | "inactiva";
const stateLabel: Record<State, string> = { libre: "Libre", atencion: "En atención", inactiva: "Desactivada" };
const stateOf = (table: Table): State => (!table.active ? "inactiva" : table.attentions[0] ? "atencion" : "libre");

export function TablesView({ tables, orders, user, run, busy, initialTableId = null, onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialTableId);
  const [qrId, setQrId] = useState<string | null>(null);
  const selected = tables.find(table => table.id === selectedId) ?? tables[0];
  const attention = selected?.attentions[0];
  const selectedOrders = attention ? orders.filter(order => order.attentionId === attention.id) : [];
  const zones = [...new Set(tables.map(table => table.zone))];

  return (
    <>
      {user.role === "ADMIN" && <NewTableForm run={run} busy={busy} />}
      {!selected ? <p className="empty-state">Todavía no hay mesas registradas.</p> : (
        <div className="mesas-workspace">
          <div>
            <div className="mesas-overview">
              <h2>Estado de mesas</h2>
              <ul className="mesas-legend" aria-label="Estados de mesa">
                {(Object.keys(stateLabel) as State[]).map(state => (
                  <li key={state}><span className={`dot dot-${state}`} aria-hidden />{stateLabel[state]}</li>
                ))}
              </ul>
            </div>
            {zones.map(zone => (
              <section key={zone} className="mesas-zone" aria-label={zone}>
                <h3>{zone}</h3>
                <div className="mesas-grid">
                  {tables.filter(table => table.zone === zone).map(table => (
                    <button
                      key={table.id}
                      type="button"
                      className={`mesa-tile mesa-${stateOf(table)}`}
                      aria-pressed={selected.id === table.id}
                      aria-controls="mesa-detalle"
                      onClick={() => { setSelectedId(table.id); setQrId(null); onSelect?.(table.id); }}
                    >
                      <span className="mesa-tile-name"><Armchair size={19} aria-hidden /> Mesa {table.name}</span>
                      <span className="mesa-tile-state"><span className={`dot dot-${stateOf(table)}`} aria-hidden /> {stateLabel[stateOf(table)]}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside id="mesa-detalle" className="mesa-detail surface" aria-labelledby="mesa-detalle-titulo">
            <div className="mesa-detail-heading">
              <h2 id="mesa-detalle-titulo"><Armchair size={22} aria-hidden /> Mesa {selected.name}</h2>
              <span className="badge">{stateLabel[stateOf(selected)]}</span>
            </div>
            <p className="mesa-detail-meta"><Users size={15} aria-hidden /> {selected.seats} {selected.seats === 1 ? "asiento" : "asientos"} <span>· {selected.zone}</span></p>
            {attention && <p className="mesa-detail-meta">Mozo: {attention.waiter.name}</p>}
            <TableOrders orders={selectedOrders} />
            {selected.recentAttentions?.length > 0 && (
              <details>
                <DisclosureSummary>Últimas atenciones cerradas</DisclosureSummary>
                <ul>{selected.recentAttentions.map(entry => (
                  <li key={entry.id}>{entry.waiter.name} · {dateTime(entry.openedAt)} – {dateTime(entry.closedAt)}</li>
                ))}</ul>
              </details>
            )}
            <TableActions resolved={selectedOrders.every(o => ["CANCELLED", "REJECTED"].includes(o.status) || (o.status === "DELIVERED" && cents(o.total) === cents(o.paid)))} table={selected} user={user} run={run} busy={busy} onQr={() => setQrId(selected.id)} />
            {qrId === selected.id && <QrPreview table={selected} onClose={() => setQrId(null)} />}
          </aside>
        </div>
      )}
    </>
  );
}

const BILLABLE = ["PENDING", "PREPARING", "READY", "DELIVERED"];

/** Pedidos de la atención: cada pedido con sus comandas y un solo saldo. */
function TableOrders({ orders }: { orders: Order[] }) {
  const accounts = [...new Set(orders.map(o => o.accountId))].map(id =>
    orders.filter(o => o.accountId === id).sort((a, b) => a.round - b.round)
  );
  return (
    <section className="mesa-orders" aria-label="Pedidos de la atención">
      <h3><ClipboardList size={17} aria-hidden /> Pedidos de la atención</h3>
      {accounts.length ? accounts.map(group => {
        const due = group.filter(o => BILLABLE.includes(o.status)).reduce((sum, o) => sum + cents(o.total) - cents(o.paid), 0);
        return (
          <article key={group[0].accountId} className="mesa-account">
            <div className="mesa-order-heading">
              <strong>Pedido #{group[0].accountNumber}</strong>
              {group.length === 1 && <span className={`badge status-${group[0].status.toLowerCase()}`}>{statusLabels[group[0].status] ?? group[0].status}</span>}
            </div>
            {group.map(order => (
              <div key={order.id} className={group.length > 1 ? "mesa-round" : undefined}>
                {group.length > 1 && (
                  <div className="mesa-order-heading">
                    <span>Comanda {order.round}</span>
                    <span className={`badge status-${order.status.toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</span>
                  </div>
                )}
                <ul>
                  {order.items.map(item => <li key={item.id}><span>{item.name}</span><span>× {item.quantity}</span></li>)}
                </ul>
              </div>
            ))}
            {group.some(o => !["CANCELLED", "REJECTED"].includes(o.status)) && (
              <p>Saldo: <strong>{money(due / 100)}</strong></p>
            )}
          </article>
        );
      }) : <p className="small-note">No hay pedidos visibles para esta atención.</p>}
    </section>
  );
}

function TableActions({ table, user, run, busy, onQr, resolved }: {
  resolved: boolean;
  table: Table;
  user: User;
  run: Run;
  busy: boolean;
  onQr: () => void;
}) {
  const state = stateOf(table);
  const attention = table.attentions[0];
  const own = user.role === "ADMIN" || attention?.waiterId === user.id;
  const canServe = ["ADMIN", "WAITER"].includes(user.role);

  return (
      <div className="mesa-actions">
        {canServe && state === "libre" && (
          <Button className="capsule" disabled={busy} onClick={() => void run(() => mutation(`tables/${table.id}/open`, {}))}>
            Abrir atención
          </Button>
        )}
        {canServe && attention && own && (
          <Button asChild className="capsule">
            <Link href={`/carta?mesa=${table.qrToken}`}>Tomar pedido</Link>
          </Button>
        )}
        {attention && ["ADMIN", "CASHIER"].includes(user.role) && (
          resolved && <Button variant="outline" className="capsule" disabled={busy} onClick={() => void run(() => mutation(`tables/${table.id}/close`, { attentionId: attention.id }))}>
            Cerrar atención
          </Button>
        )}
        {canServe && (
          <Button variant="outline" className="capsule" onClick={onQr}>Ver QR</Button>
        )}
        {user.role === "ADMIN" && (
          <>
            <Button
              variant="outline"
              className="capsule"
              disabled={busy}
              onClick={() => void run(() => mutation(`tables/${table.id}`, { active: !table.active }, "PATCH"))}
            >
              {table.active ? "Desactivar" : "Activar"}
            </Button>
            <Button
              variant="outline"
              className="capsule"
              disabled={busy}
              onClick={() => {
                if (confirm("El QR anterior dejará de funcionar. ¿Generar uno nuevo?")) void run(() => mutation(`tables/${table.id}/rotate-qr`, {}));
              }}
            >
              Renovar QR
            </Button>
          </>
        )}
        {attention && !resolved && ["ADMIN", "CASHIER"].includes(user.role) && <p className="mesa-close-note small-note">Cierre pendiente de entrega o pago</p>}
      </div>
  );
}

function NewTableForm({ run, busy }: { run: Run; busy: boolean }) {
  return (
    <details className="surface">
      <DisclosureSummary icon={Armchair}>Agregar una mesa</DisclosureSummary>
      <form
        className="inline-form"
        onSubmit={e => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          void run(async () => {
            await mutation("tables", { ...data, seats: Number(data.seats) });
            form.reset();
          });
        }}
      >
        <label>
          Nombre o número
          <input name="name" required maxLength={40} placeholder="Ej.: Terraza 5" />
        </label>
        <label>
          Zona
          <input name="zone" defaultValue="Jardín" required maxLength={60} />
        </label>
        <label>
          Asientos
          <input name="seats" type="number" min="1" max="50" defaultValue="4" required />
        </label>
        <Button disabled={busy}>Agregar mesa y generar QR</Button>
      </form>
    </details>
  );
}

function QrPreview({ table, onClose }: { table: Table; onClose: () => void }) {
  return (
    <section className="qr-sheet mesa-qr" aria-label={`QR de la mesa ${table.name}`}>
      <span className="eyebrow">Bienvenido a tu mesa</span>
      <h2>Mesa {table.name}</h2>
      <p>Escanea, elige y envía tu pedido. Tu mozo lo confirmará antes de enviarlo a cocina.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG generado por la API */}
      <img src={`/api/v1/tables/${table.id}/qr`} width={220} height={220} alt={`Código QR para pedir en la mesa ${table.name}`} />
      <div className="order-actions qr-actions">
        <Button asChild variant="outline">
          <Link href={`/panel/mesas/${table.id}`}>Abrir hoja para imprimir</Link>
        </Button>
        <Button variant="ghost" onClick={onClose}>Cerrar QR</Button>
      </div>
    </section>
  );
}
