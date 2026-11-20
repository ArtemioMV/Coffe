"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  BellOff,
  Inbox,
  LogOut,
  LayoutDashboard,
  UtensilsCrossed,
  Armchair,
  CookingPot,
  Package,
  MessageSquare,
  Users,
  Printer,
  RefreshCw,
  Wallet,
  Sparkles,
  Check,
  AlertTriangle,
  Clock,
  Search,
  Share2
} from "lucide-react";
import { Button } from "@restaurant/ui";
import { money, statusLabels } from "@restaurant/contracts";
import { api, mutation, sessionExpired, SESSION_EVENT, User, Order, Table, Notice, Product, dateTime } from "@/lib/client";
import { brandLogo } from "@/lib/brand";
import { DisclosureSummary } from "@/components/disclosure-summary";
import { PanelNotices } from "@/modules/notificaciones/panel-notices";
import { KitchenBoard } from "@/modules/pedidos/kitchen-board";
import { TablesView } from "@/modules/mesas/tables-view";
import { AdminSocial } from "@/modules/social/admin-social";

type Run = (task: () => Promise<unknown>) => Promise<void>;
const roleNames = {
  ADMIN: "Administración",
  WAITER: "Mozo",
  KITCHEN: "Cocina / barra",
  CASHIER: "Caja",
  CUSTOMER: "Cliente"
};

const tabLabels: Record<string, string> = {
  orders: "Pedidos",
  tables: "Mesas y QR",
  catalog: "Carta",
  inventory: "Inventario",
  feedback: "Te escuchamos",
  social: "Redes sociales",
  users: "Usuarios",
  reports: "Reportes"
};

const icons = {
  orders: CookingPot,
  tables: Armchair,
  catalog: UtensilsCrossed,
  inventory: Package,
  feedback: MessageSquare,
  social: Share2,
  users: Users,
  reports: LayoutDashboard
};

type PanelProps = { initialUser?: User | null; initialTab?: string; initialTableId?: string };

/** Pestaña y mesa viven en la URL (?vista=tables&mesa=…) para volver al mismo lugar desde la carta o el ticket. */
function remember(params: Record<string, string | null>) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(history.state, "", url);
}

export function Panel({ initialUser, initialTab, initialTableId }: PanelProps = {}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [booted, setBooted] = useState(initialUser !== undefined);
  const [tab, setTabState] = useState(initialTab && initialTab in tabLabels ? initialTab : "orders");
  const setTab = (next: string) => {
    setTabState(next);
    remember({ vista: next, mesa: null });
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showNotices, setShowNotices] = useState(false);
  const [connection, setConnection] = useState("Conectando…");
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const known = useRef(new Set<string>());
  const latestLoad = useRef(0);

  // Si la sesión vence o se cierra en otra pestaña, se vuelve al ingreso en lugar de mostrar un panel vacío.
  const fail = useCallback((e: unknown) => {
    if (sessionExpired(e)) {
      setUser(null);
      setError("Tu sesión terminó. Vuelve a ingresar.");
      window.dispatchEvent(new Event(SESSION_EVENT));
      return true;
    }
    setError((e as Error).message);
    return false;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const request = ++latestLoad.current;
    const withTables = ["ADMIN", "WAITER", "CASHIER"].includes(user.role);
    try {
      const [orderData, noticeData, tableData] = await Promise.all([
        api<{ orders: Order[] }>("orders"),
        api<{ notifications: Notice[] }>("notifications"),
        withTables ? api<{ tables: Table[] }>("tables") : Promise.resolve(null)
      ]);
      if (request !== latestLoad.current) return;
      setOrders(orderData.orders);
      setNotices(noticeData.notifications);
      if (tableData) setTables(tableData.tables);
      setDataStatus("ready");
    } catch (e) {
      if (request !== latestLoad.current) return;
      if (sessionExpired(e)) fail(e);
      else setDataStatus("unavailable");
    }
  }, [user, fail]);

  useEffect(() => {
    if (initialUser !== undefined) return;
    api<{ user: User | null }>("auth/me")
      .then(r => setUser(r.user))
      .catch(e => setError(e.message))
      .finally(() => setBooted(true));
  }, [initialUser]);

  useEffect(() => {
    void load();
    return () => { latestLoad.current += 1; };
  }, [load]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let stream: EventSource | undefined;
    void api<{ notifications: Notice[] }>("notifications")
      .then(r => {
        if (!active) return;
        r.notifications.forEach(n => known.current.add(n.id));
        setNotices(r.notifications);
        const after = Math.max(0, ...r.notifications.map(n => n.sequence));
        stream = new EventSource(`/api/v1/events?after=${after}`);
        stream.onopen = () => setConnection("En línea");
        stream.onerror = () => setConnection("Reconectando · consulta de respaldo activa");
        stream.onmessage = message => {
          const notice = JSON.parse(message.data) as Notice;
          if (!known.current.has(notice.id)) {
            known.current.add(notice.id);
            if (sound && audio.current) {
              const play = () => {
                const key = `notice-sound:${notice.id}`;
                if (localStorage.getItem(key)) return;
                localStorage.setItem(key, "played");
                const context = audio.current!;
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.frequency.value = notice.title.includes("listo") ? 880 : 620;
                gain.gain.value = 0.08;
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.22);
              };
              if (navigator.locks) void navigator.locks.request("restaurant-audio", play);
              else play();
            }
          }
          void load();
        };
      })
      .catch(e => {
        if (!active) return;
        if (sessionExpired(e)) fail(e);
        else setConnection("Consulta periódica");
      });
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => {
      active = false;
      stream?.close();
      clearInterval(timer);
    };
  }, [user, load, sound, fail]);

  function enter(next: User) {
    setUser(next);
    setDataStatus("loading");
    setError("");
    window.dispatchEvent(new Event(SESSION_EVENT));
  }

  const run = async (task?: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task?.();
      setRefresh(v => v + 1);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!booted)
    return (
      <div className="page-shell">
        <p className="empty-state">Preparando tu espacio campestre…</p>
      </div>
    );

  if (!user) return <Access onUser={enter} initialError={error} />;

  const tabs =
    user.role === "ADMIN"
      ? ["orders", "tables", "catalog", "inventory", "feedback", "social", "users", "reports"]
      : user.role === "WAITER"
      ? ["orders", "tables"]
      : user.role === "KITCHEN"
      ? ["orders", "inventory"]
      : user.role === "CASHIER"
      ? ["orders", "tables", "reports"]
      : ["orders"];

  // Una vista de la URL que no corresponde al rol cae en la primera disponible.
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const unread = notices.filter(n => !n.readAt).length;

  async function activateSound() {
    audio.current ??= new AudioContext();
    await audio.current.resume();
    setSound(v => !v);
  }

  return (
    <div className="workspace">
      <aside className="workspace-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <Image src={brandLogo} width={40} height={40} alt="" />
          <div>
            <span className="eyebrow" style={{ margin: 0 }}>TU ESPACIO</span>
            <h2 style={{ margin: 0 }}>{roleNames[user.role]}</h2>
          </div>
        </div>
        <p style={{ margin: 0 }}>{user.name}</p>

        <nav aria-label="Panel">
          {tabs.map(t => {
            const Icon = icons[t as keyof typeof icons];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={activeTab === t ? "active" : ""}
              >
                <Icon size={19} aria-hidden />
                {user.role === "CUSTOMER" && t === "orders" ? "Mis pedidos" : tabLabels[t]}
              </button>
            );
          })}
        </nav>

        {user.role === "CUSTOMER" && (
          <div style={{ padding: "0.8rem 1rem", margin: "1rem 0" }}>
            <p style={{ margin: 0 }}>
              Tu saldo: <strong>{user.points} puntos</strong>
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          style={{ marginTop: "auto", width: "100%", justifyContent: "flex-start" }}
          onClick={() =>
            void run(async () => {
              await mutation("auth/logout", {});
              setUser(null);
              window.dispatchEvent(new Event(SESSION_EVENT));
            })
          }
        >
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </aside>

      <div className="workspace-main">
        <div className="workspace-top">
          <div>
            <span className="eyebrow">OPERACIÓN DEL RESTAURANTE</span>
            <h1>{tabLabels[activeTab]}</h1>
            <span className="connection" aria-live="polite">
              <span style={{ width: "8px", height: "8px", display: "inline-block" }} />
              {dataStatus === "unavailable" ? "Datos sin actualizar" : connection}
            </span>
          </div>

          <div className="toolbar">
            <Button variant="outline" aria-label="Actualizar" onClick={() => void run()} disabled={busy}>
              <RefreshCw aria-hidden className={busy ? "animate-spin" : ""} />
              <span className="desktop-label">Actualizar</span>
            </Button>
            <Button
              variant="outline"
              className="icon-button"
              onClick={() => void activateSound()}
              aria-pressed={sound}
              aria-label={sound ? "Silenciar avisos" : "Activar sonido de avisos"}
              title={sound ? "Sonido activo: pulsa para silenciar" : "Sonido apagado: pulsa para activar"}
            >
              {sound ? <Bell aria-hidden /> : <BellOff aria-hidden />}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNotices(visible => !visible)}
              aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
              aria-expanded={showNotices}
              aria-controls={showNotices ? "notificaciones" : undefined}
            >
              <Inbox aria-hidden />
              {unread > 0 && (
                <span className="notice-count" aria-hidden>
                  {unread}
                </span>
              )}
            </Button>
          </div>
        </div>

        {(error || dataStatus === "unavailable") && (
          <p role="alert" className="error-banner workspace-alert">
            <AlertTriangle size={15} aria-hidden />
            {error || "No se pudo actualizar el panel. Pulsa Actualizar para reintentar."}
          </p>
        )}

        {showNotices && (
          <PanelNotices
            notices={notices}
            busy={busy}
            onRead={id => void run(() => mutation(`notifications/${id}`, {}, "PATCH"))}
          />
        )}

        {activeTab === "orders" && dataStatus === "loading" && <p className="workspace-message" role="status">Cargando pedidos…</p>}
        {activeTab === "orders" && dataStatus === "ready" && <OrdersView orders={orders} user={user} run={run} busy={busy} />}
        {activeTab === "tables" && (
          <TablesView
            tables={tables}
            orders={orders}
            user={user}
            run={run}
            busy={busy}
            initialTableId={initialTableId}
            onSelect={id => remember({ mesa: id })}
          />
        )}
        {activeTab === "catalog" && <CatalogView run={run} refresh={refresh} busy={busy} />}
        {activeTab === "inventory" && <InventoryView run={run} refresh={refresh} busy={busy} user={user} />}
        {activeTab === "feedback" && <FeedbackView run={run} refresh={refresh} busy={busy} />}
        {activeTab === "social" && user.role === "ADMIN" && <AdminSocial run={run} busy={busy} onError={fail} />}
        {activeTab === "users" && <UsersView run={run} refresh={refresh} busy={busy} user={user} />}
        {activeTab === "reports" && <ReportsView refresh={refresh} />}
      </div>
    </div>
  );
}

function Access({ onUser, initialError }: { onUser: (user: User) => void; initialError: string }) {
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      onUser((await mutation<{ user: User }>(registering ? "auth/register" : "auth/login", form)).user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell narrow">
      <div className="page-heading" style={{ textAlign: "center" }}>
        <Image src={brandLogo} width={80} height={80} alt="" style={{ margin: "0 auto 1.2rem" }} />
        <span className="eyebrow">BIENVENIDO A CASA · LA POSADA CAJAMARQUINA</span>
        <h1>{registering ? "Crea tu cuenta" : "Tu espacio en la mesa"}</h1>
        <p>Consulta tus pedidos o ingresa a tu estación de trabajo (Mozo, Cocina, Barra, Caja).</p>
      </div>

      <section className="surface" style={{ maxWidth: "480px", margin: "0 auto" }}>
        <form onSubmit={submit}>
          {error && <p role="alert" className="error-banner">{error}</p>}

          {registering && (
            <label>
              Nombre
              <input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Tu nombre completo" />
            </label>
          )}

          <label>
            Correo
            <input name="email" required type="email" autoComplete="email" placeholder="ejemplo@restaurante.test" />
          </label>

          <label>
            Contraseña
            <input
              name="password"
              required
              minLength={10}
              maxLength={100}
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              placeholder="Mínimo 10 caracteres"
            />
          </label>

          <Button className="full-width button-primary" disabled={busy}>
            {busy ? "Un momento…" : registering ? "Crear cuenta" : "Ingresar"}
          </Button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.4rem", paddingTop: "1rem" }}>
          <Button variant="ghost" onClick={() => setRegistering(v => !v)}>
            {registering ? "Ya tengo cuenta" : "Quiero registrarme"}
          </Button>
          <Link href="/recuperar" className="text-link">
            Recuperar contraseña
          </Link>
        </div>
      </section>
    </div>
  );
}

function OrdersView({ orders, user, run, busy }: { orders: Order[]; user: User; run: Run; busy: boolean }) {
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const kitchenView = user.role === "KITCHEN";

  async function action(order: Order, value: string) {
    let reason = "";
    if (["reject", "cancel"].includes(value)) {
      const input = prompt("Motivo (mínimo 5 caracteres)");
      if (!input) return;
      reason = input;
    }
    await run(() => mutation(`orders/${order.id}/transition`, { action: value, version: order.version, reason }));
  }

  function actions(order: Order) {
    const waiter = ["ADMIN", "WAITER"].includes(user.role);
    const kitchen = ["ADMIN", "KITCHEN"].includes(user.role);

    return (
      <>
        {order.status === "AWAITING_WAITER" && waiter && (
          <>
            <Button disabled={busy} className="button-primary" onClick={() => void action(order, "confirm")}>
              Confirmar y enviar a cocina
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => void action(order, "reject")}>
              Rechazar
            </Button>
          </>
        )}
        {order.status === "PENDING" && kitchen && (
          <Button disabled={busy} className="button-primary" onClick={() => void action(order, "prepare")}>
            Iniciar preparación
          </Button>
        )}
        {order.status === "PREPARING" && kitchen && (
          <Button disabled={busy} className="button-primary" onClick={() => void action(order, "ready")}>
            Marcar listo
          </Button>
        )}
        {order.status === "READY" && waiter && (
          <>
            {!order.acknowledgedAt && (
              <Button disabled={busy} className="button-primary" onClick={() => void action(order, "acknowledge")}>
                Voy a recoger
              </Button>
            )}
            <Button disabled={busy} variant="outline" onClick={() => void action(order, "deliver")}>
              Confirmar entrega
            </Button>
          </>
        )}
        {user.role === "ADMIN" && ["AWAITING_WAITER", "PENDING", "PREPARING", "READY"].includes(order.status) && (
          <Button disabled={busy} variant="ghost" onClick={() => void action(order, "cancel")}>
            Cancelar
          </Button>
        )}
      </>
    );
  }

  const visible = orders.filter(
    o => kitchenView
      ? `${o.number} mesa ${o.tableName}`.toLocaleLowerCase("es").includes(search.trim().replace(/^#/, "").toLocaleLowerCase("es"))
      : filter === "all" ||
      filter === o.status ||
      (filter === "active" && !["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status))
  );

  function renderOrder(order: Order) {
    return (
      <article
        key={order.id}
        className={`order-card ${order.status === "READY" ? "order-ready" : ""}`}
      >
        <div className="order-card-header">
          <div>
            <h3>Pedido #{order.number}</h3>
            <span className="order-table-label"><Armchair size={15} aria-hidden /> Mesa {order.tableName}</span>
          </div>
          {!kitchenView && <span className={`badge status-${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span>}
        </div>
        <small className="order-timestamp"><Clock size={13} aria-hidden /> {dateTime(order.createdAt)} {order.guestName && !kitchenView && `· ${order.guestName}`}</small>
        {order.items.map(item => (
          <div className="order-item" key={item.id}>
            <div className="order-item-line">
              <strong>{item.name}</strong><span>× {item.quantity}</span>
            </div>
            <span className="station-label">{item.station === "BAR" ? "Barra" : "Cocina"}</span>
            {item.notes && <p className="item-instruction">{item.notes}</p>}
          </div>
        ))}
        {order.notes && <p className="order-notes">Observaciones: {order.notes}</p>}
        {!kitchenView && (
          <div className="cart-total">
            <span>Total: {money(order.total)}</span>
            <span>Saldo: {money(Number(order.total) - Number(order.paid))}</span>
          </div>
        )}
        <div className="order-actions">
          {actions(order)}
          {user.role !== "CUSTOMER" && (
            <Button asChild variant="outline">
              <Link href={`/panel/ticket/${order.id}?tipo=${kitchenView ? "comanda" : "precuenta"}`}>
                <Printer size={16} aria-hidden /> {kitchenView ? "Imprimir comanda" : "Imprimir"}
              </Link>
            </Button>
          )}
          {user.role === "CUSTOMER" && (
            <Button asChild variant="outline"><Link href={`/pedido/${order.id}`}>Ver seguimiento</Link></Button>
          )}
        </div>
        {["ADMIN", "CASHIER"].includes(user.role) &&
          Number(order.paid) < Number(order.total) &&
          ["PENDING", "PREPARING", "READY", "DELIVERED"].includes(order.status) && (
            <PaymentForm order={order} run={run} busy={busy} />
          )}
      </article>
    );
  }

  if (kitchenView) return (
    <>
      <label className="search-field kitchen-search">
        <Search size={18} aria-hidden />
        <span className="sr-only">Buscar pedido por número o mesa</span>
        <input type="search" placeholder="Buscar pedido por número o mesa" value={search} onChange={e => setSearch(e.target.value)} />
      </label>
      <KitchenBoard orders={visible} renderOrder={renderOrder} />
    </>
  );

  return (
    <>
      <div className="filter-row">
        <label>
          Mostrar
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="active">En atención activa</option>
            <option value="all">Todos los pedidos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {visible.length > 0 && <p>{visible.length} {visible.length === 1 ? "pedido" : "pedidos"}</p>}
      </div>

      {visible.length ? (
        <div className="orders-grid">{visible.map(renderOrder)}</div>
      ) : (
        <p className="workspace-message">No hay pedidos en esta vista.</p>
      )}
    </>
  );
}

function PaymentForm({ order, run, busy }: { order: Order; run: Run; busy: boolean }) {
  const [show, setShow] = useState(false);
  const key = useRef(crypto.randomUUID());

  return (
    <div className="payment-form">
      <Button variant="outline" onClick={() => setShow(v => !v)}>
        <Wallet size={16} /> Registrar cobro conciliado
      </Button>
      {show && (
        <form
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
          onSubmit={e => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            void run(async () => {
              await mutation(`orders/${order.id}/payments`, values, "POST", {
                "Idempotency-Key": key.current
              });
              setShow(false);
            });
          }}
          style={{ marginTop: "1rem", padding: "1rem" }}
        >
          <label>
            Importe (S/)
            <input
              name="amount"
              defaultValue={(Number(order.total) - Number(order.paid)).toFixed(2)}
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </label>
          <label>
            Método
            <select name="method">
              <option>EFECTIVO</option>
              <option>TARJETA</option>
              <option>TRANSFERENCIA</option>
            </select>
          </label>
          <label>
            Referencia (obligatoria salvo efectivo)
            <input name="reference" maxLength={100} placeholder="N° de operación o voucher" />
          </label>
          <Button className="button-primary" disabled={busy}>
            Confirmar pago recibido
          </Button>
          <p className="small-note">
            Registra un pago ya verificado. No realiza cargos en línea ni emite comprobante electrónico.
          </p>
        </form>
      )}
    </div>
  );
}

function CatalogView({ run, refresh, busy }: { run: Run; refresh: number; busy: boolean }) {
  const [data, setData] = useState<{ categories: { id: string; name: string }[]; products: Product[] }>({
    categories: [],
    products: []
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data>("catalog").then(setData).catch(e => setError(e.message));
  }, [refresh]);

  return (
    <>
      {error && <p role="alert" className="error-banner">{error}</p>}
      <section className="surface">
        <h2>{editing ? "Editar plato" : "Agregar a la carta"}</h2>
        <form
          key={editing?.id || "new"}
          onSubmit={e => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            void run(async () => {
              await mutation(
                editing ? `products/${editing.id}` : "products",
                { ...values, active: true, available: true },
                editing ? "PATCH" : "POST"
              );
              form.reset();
              setEditing(null);
            });
          }}
        >
          <div className="form-grid">
            <label>
              Nombre
              <input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name} />
            </label>
            <label>
              Precio (S/)
              <input name="price" type="number" min="0" step="0.01" required defaultValue={editing?.price} />
            </label>
            <label>
              Categoría
              <select name="categoryId" required defaultValue={editing?.categoryId}>
                <option value="">Selecciona</option>
                {data.categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estación
              <select name="station" defaultValue={editing?.station || "KITCHEN"}>
                <option value="KITCHEN">Cocina</option>
                <option value="BAR">Barra</option>
              </select>
            </label>
          </div>
          <label>
            Descripción
            <textarea name="description" maxLength={1000} defaultValue={editing?.description} />
          </label>
          <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem" }}>
            <Button className="button-primary" disabled={busy}>Guardar plato</Button>
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar edición
              </Button>
            )}
          </div>
        </form>

        <details style={{ marginTop: "1.5rem" }}>
          <DisclosureSummary icon={UtensilsCrossed}>Agregar categoría</DisclosureSummary>
          <form
            className="inline-form"
            onSubmit={e => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              void run(async () => {
                await mutation("categories", values);
                form.reset();
              });
            }}
          >
            <label>
              Nombre
              <input name="name" required minLength={2} maxLength={80} />
            </label>
            <Button className="button-primary" disabled={busy}>Crear categoría</Button>
          </form>
        </details>
      </section>

      <div className="surface table-scroll">
        <table>
          <caption>Platos y bebidas de la carta</caption>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Publicación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{data.categories.find(c => c.id === p.categoryId)?.name}</small>
                </td>
                <td>{money(p.price)}</td>
                <td>
                  <span className={`badge ${!p.active ? "status-rejected" : p.available ? "status-ready" : "status-awaiting_waiter"}`}>
                    {!p.active ? "Desactivado" : p.available ? "Disponible" : "Agotado"}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    <Button variant="ghost" onClick={() => setEditing(p)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(() => mutation(`products/${p.id}`, { available: !p.available }, "PATCH"))
                      }
                    >
                      {p.available ? "Agotar" : "Disponible"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(() => mutation(`products/${p.id}`, { active: !p.active }, "PATCH"))
                      }
                    >
                      {p.active ? "Desactivar" : "Publicar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type Ingredient = { id: string; name: string; unit: string; stock: string; minimum: string };
function InventoryView({
  run,
  refresh,
  busy,
  user
}: {
  run: Run;
  refresh: number;
  busy: boolean;
  user: User;
}) {
  const [data, setData] = useState<{
    ingredients: Ingredient[];
    movements: {
      id: string;
      quantity: string;
      reason: string;
      kind: string;
      createdAt: string;
      ingredient: { name: string; unit: string };
    }[];
  }>({ ingredients: [], movements: [] });
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [recipe, setRecipe] = useState<{ ingredientId: string; quantity: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data>("inventory")
      .then(setData)
      .catch(e => setError(e.message));
    if (user.role === "ADMIN")
      api<{ products: Product[] }>("catalog")
        .then(r => setProducts(r.products))
        .catch(e => setError(e.message));
  }, [refresh, user.role]);

  return (
    <>
      {error && <p role="alert" className="error-banner">{error}</p>}
      {user.role === "ADMIN" && (
        <>
          <details className="surface">
            <DisclosureSummary icon={Package}>Agregar insumo</DisclosureSummary>
            <form
              className="inline-form"
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                void run(async () => {
                  await mutation("inventory", Object.fromEntries(new FormData(form)));
                  form.reset();
                });
              }}
            >
              <label>
                Nombre
                <input name="name" required minLength={2} maxLength={100} />
              </label>
              <label>
                Unidad
                <select name="unit">{["kg", "g", "L", "ml", "unidad"].map(u => <option key={u}>{u}</option>)}</select>
              </label>
              <label>
                Mínimo
                <input type="number" step="0.001" min="0" name="minimum" defaultValue="0" required />
              </label>
              <Button className="button-primary" disabled={busy}>Agregar</Button>
            </form>
          </details>

          <details className="surface">
            <DisclosureSummary icon={LayoutDashboard}>Registrar entrada, merma o ajuste</DisclosureSummary>
            <form
              className="form-grid"
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                const values = Object.fromEntries(new FormData(form));
                void run(async () => {
                  await mutation(`inventory/${values.ingredientId}/movements`, values);
                  form.reset();
                });
              }}
            >
              <label>
                Insumo
                <select name="ingredientId" required>
                  <option value="">Selecciona</option>
                  {data.ingredients.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select name="kind">
                  <option>ENTRADA</option>
                  <option>MERMA</option>
                  <option>AJUSTE</option>
                </select>
              </label>
              <label>
                Cantidad (negativa para salida)
                <input name="quantity" type="number" step="0.001" required />
              </label>
              <label>
                Motivo
                <input name="reason" required minLength={5} maxLength={300} />
              </label>
              <Button className="button-primary" disabled={busy}>Registrar movimiento</Button>
            </form>
          </details>

          <details className="surface">
            <DisclosureSummary icon={CookingPot}>Receta y consumo por plato</DisclosureSummary>
            <label>
              Plato
              <select
                value={selected}
                onChange={e => {
                  setSelected(e.target.value);
                  setRecipe(products.find(p => p.id === e.target.value)?.recipe || []);
                }}
              >
                <option value="">Selecciona</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {recipe.map((item, index) => (
              <div className="inline-form" key={index}>
                <label>
                  Insumo
                  <select
                    value={item.ingredientId}
                    onChange={e =>
                      setRecipe(
                        recipe.map((r, i) => (i === index ? { ...r, ingredientId: e.target.value } : r))
                      )
                    }
                  >
                    <option value="">Selecciona</option>
                    {data.ingredients.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad por plato
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={e =>
                      setRecipe(recipe.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))
                    }
                  />
                </label>
                <Button variant="ghost" onClick={() => setRecipe(recipe.filter((_, i) => i !== index))}>
                  Quitar
                </Button>
              </div>
            ))}
            <div className="order-actions">
              <Button
                variant="outline"
                disabled={!selected}
                onClick={() => setRecipe([...recipe, { ingredientId: "", quantity: "1" }])}
              >
                Añadir insumo a receta
              </Button>
              <Button
                className="button-primary"
                disabled={!selected || busy}
                onClick={() => void run(() => mutation(`products/${selected}/recipe`, recipe, "PUT"))}
              >
                Guardar receta
              </Button>
            </div>
            <p className="small-note">
              El consumo se descuenta al confirmar el pedido del cliente. Sin receta, el plato no descuenta insumos automáticamente.
            </p>
          </details>
        </>
      )}

      <section className="surface table-scroll">
        <table>
          <caption>Existencias por unidad</caption>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Stock</th>
              <th>Mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.ingredients.map(i => (
              <tr key={i.id}>
                <td><strong>{i.name}</strong></td>
                <td>{i.stock} {i.unit}</td>
                <td>{i.minimum} {i.unit}</td>
                <td>
                  {Number(i.stock) <= Number(i.minimum) ? (
                    <span className="badge status-awaiting_waiter">Stock bajo</span>
                  ) : (
                    <span className="badge status-ready">Disponible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.ingredients.length && <p>No hay insumos registrados.</p>}
      </section>

      <section className="surface table-scroll">
        <table>
          <caption>Últimos movimientos</caption>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Tipo / motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.map(m => (
              <tr key={m.id}>
                <td>{dateTime(m.createdAt)}</td>
                <td><strong>{m.ingredient.name}</strong></td>
                <td>{m.quantity} {m.ingredient.unit}</td>
                <td>
                  <span className="badge">{m.kind}</span>
                  <small>{m.reason}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

type Claim = {
  id: string;
  number: number;
  name: string;
  email: string;
  kind: string;
  detail: string;
  request: string;
  status: string;
  response: string | null;
  createdAt: string;
};

function FeedbackView({ run, refresh, busy }: { run: Run; refresh: number; busy: boolean }) {
  const [data, setData] = useState<{
    claims: Claim[];
    suggestions: { id: string; message: string; contact: string; status: string }[];
    ratings: { id: string; score: number; comment: string }[];
  }>({ claims: [], suggestions: [], ratings: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data>("feedback").then(setData).catch(e => setError(e.message));
  }, [refresh]);

  return (
    <>
      {error && <p className="error-banner">{error}</p>}
      <section className="surface">
        <h2>Libro de Reclamaciones</h2>
        {!data.claims.length && <p>No hay hojas registradas.</p>}
        {data.claims.map(c => (
          <details key={c.id}>
            <DisclosureSummary icon={MessageSquare}>
              Hoja #{c.number} · {c.kind} · {c.status}
            </DisclosureSummary>
            <p>
              {c.name} · {c.email} · {dateTime(c.createdAt)}
            </p>
            <h3>Detalle</h3>
            <p className="preserve-text">{c.detail}</p>
            <h3>Pedido del consumidor</h3>
            <p className="preserve-text">{c.request}</p>
            {c.response ? (
              <>
                <h3>Respuesta registrada</h3>
                <p>{c.response}</p>
              </>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  void run(() => mutation(`claims/${c.id}`, Object.fromEntries(new FormData(form)), "PATCH"));
                }}
              >
                <label>
                  Respuesta al consumidor
                  <textarea name="response" required minLength={10} maxLength={4000} />
                </label>
                <Button className="button-primary" disabled={busy}>Registrar respuesta y tramitar correo</Button>
                <p className="small-note">
                  El registro de respuesta no demuestra la entrega del correo. Revisa las entregas pendientes del worker.
                </p>
              </form>
            )}
          </details>
        ))}
      </section>

      <section className="surface">
        <h2>Sugerencias</h2>
        {!data.suggestions.length && <p>No hay sugerencias todavía.</p>}
        {data.suggestions.map(s => (
          <article className="notice" key={s.id}>
            <div>
              <p>{s.message}</p>
              <small>{s.contact || "Anónima"} · {s.status}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="surface">
        <h2>Valoraciones</h2>
        {!data.ratings.length && <p>Aún no hay valoraciones registradas.</p>}
        {data.ratings.map(r => (
          <article className="notice" key={r.id}>
            <strong>{r.score}/5 ⭐</strong>
            <p>{r.comment || "Sin comentario adicional."}</p>
          </article>
        ))}
      </section>
    </>
  );
}

function UsersView({
  run,
  refresh,
  busy,
  user
}: {
  run: Run;
  refresh: number;
  busy: boolean;
  user: User;
}) {
  const [users, setUsers] = useState<(User & { active: boolean })[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ users: typeof users }>("users").then(r => setUsers(r.users)).catch(e => setError(e.message));
  }, [refresh]);

  return (
    <section className="surface table-scroll">
      {error && <p role="alert" className="error-banner">{error}</p>}
      <p>Las cuentas nuevas se registran en «Mi cuenta»; administración asigna aquí su función.</p>
      <table>
        <caption>Usuarios y permisos</caption>
        <thead>
          <tr>
            <th>Persona</th>
            <th>Rol</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </td>
              <td>
                <label style={{ margin: 0 }}>
                  <span className="sr-only">Rol de {u.name}</span>
                  <select
                    value={u.role}
                    disabled={u.id === user.id || busy}
                    onChange={e => void run(() => mutation(`users/${u.id}`, { role: e.target.value }, "PATCH"))}
                  >
                    {Object.entries(roleNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </td>
              <td>
                <Button
                  variant="ghost"
                  disabled={u.id === user.id || busy}
                  onClick={() => void run(() => mutation(`users/${u.id}`, { active: !u.active }, "PATCH"))}
                >
                  {u.active ? "Desactivar" : "Activar"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportsView({ refresh }: { refresh: number }) {
  const [data, setData] = useState<{
    collected: string;
    paymentCount: number;
    orders: { status: string; _count: number; _sum: { total: string } }[];
    lowStock: Ingredient[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<NonNullable<typeof data>>("reports").then(setData).catch(e => setError(e.message));
  }, [refresh]);

  return (
    <>
      {error && <p role="alert" className="error-banner">{error}</p>}
      {data && (
        <>
          <div className="stat-grid">
            <article className="surface">
              <span>Total cobrado registrado</span>
              <strong>{money(data.collected)}</strong>
            </article>
            <article className="surface">
              <span>Pagos registrados</span>
              <strong>{data.paymentCount}</strong>
            </article>
            <article className="surface">
              <span>Insumos bajo mínimo</span>
              <strong>
                {data.lowStock.length}
              </strong>
            </article>
          </div>

          <section className="surface table-scroll">
            <table>
              <caption>Pedidos por estado · Histórico completo</caption>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cantidad</th>
                  <th>Total de pedidos</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map(o => (
                  <tr key={o.status}>
                    <td>
                      <span className={`badge status-${o.status.toLowerCase()}`}>
                        {statusLabels[o.status]}
                      </span>
                    </td>
                    <td><strong>{o._count}</strong></td>
                    <td>{money(o._sum.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small-note">
              Total de pedidos y total cobrado son métricas diferentes. Los pagos se registran después de verificar el cobro.
            </p>
          </section>
        </>
      )}
    </>
  );
}
