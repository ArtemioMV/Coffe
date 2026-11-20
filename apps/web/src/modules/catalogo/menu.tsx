"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Search, Sparkles, X } from "lucide-react";
import { Button } from "@restaurant/ui";
import { api, mutation, type Category } from "@/lib/client";
import { useCart } from "./use-cart";
import { ALL, CategoryNav } from "./category-nav";
import { ProductRow } from "./product-row";
import { OrderPanel } from "./order-panel";
import { CheckoutForm } from "./checkout-form";
import { OrderBar } from "./order-bar";

/** «mine»: el usuario conectado es el mozo de esta atención (o administración); su pedido va directo a cocina. */
type TableInfo = { name: string; zone: string; open: boolean; mine?: boolean; id?: string };

const matches = (text: string, query: string) =>
  text.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"));

export function Menu({ tableToken }: { tableToken: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [selected, setSelected] = useState(ALL);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const products = categories.flatMap(c => c.products);
  const staff = Boolean(table?.open && table.mine);
  const cart = useCart(`restaurant-cart:${tableToken || "browse"}`, products);

  useEffect(() => {
    api<{ categories: Category[] }>("menu")
      .then(r => setCategories(r.categories))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    if (tableToken) {
      api<TableInfo>(`tables/resolve/${encodeURIComponent(tableToken)}`)
        .then(setTable)
        .catch(e => setError(e.message));
    }
  }, [tableToken]);

  async function send({ guestName, notes }: { guestName: string; notes: string }) {
    if (busy) return;
    setBusy(true);
    setError("");
    cart.idempotencyKey.current ||= crypto.randomUUID();
    try {
      const result = await mutation<{ order: { id: string }; token: string }>(
        "orders",
        {
          tableToken,
          guestName,
          notes,
          items: cart.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
            expectedPrice: i.product.price
          }))
        },
        "POST",
        { "Idempotency-Key": cart.idempotencyKey.current }
      );
      cart.clear();
      if (staff && table?.id) {
        // El mozo vuelve a su mesa en el panel, donde ya ve la comanda enviada.
        router.push(`/panel?vista=tables&mesa=${table.id}`);
        return;
      }
      sessionStorage.setItem(`order:${result.order.id}`, result.token);
      router.push(`/pedido/${result.order.id}#${result.token}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sections = categories
    .filter(c => selected === ALL || selected === c.id)
    .map(c => ({
      ...c,
      products: c.products.filter(p => matches(`${p.name} ${p.description}`, search))
    }))
    .filter(c => c.products.length);

  const shown = sections.reduce((sum, c) => sum + c.products.length, 0);
  const heading =
    selected === ALL
      ? "Toda la carta"
      : categories.find(c => c.id === selected)?.name ?? "Carta";

  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">HECHO PARA COMPARTIR · LA POSADA CAJAMARQUINA</span>
        <h1>Nuestra carta</h1>
        <p>Sabores de casa, preparados al momento con ingredientes frescos del valle.</p>
      </header>

      {table ? (
        <div className={table.open ? "table-banner" : "info-banner"}>
          <strong>Mesa {table.name} · {table.zone}</strong>
          <span>
            {staff
              ? "Tomando el pedido de la mesa: se envía directo a cocina."
              : table.open
              ? "Elige tus platos; tu mozo confirmará el pedido."
              : "Pide al mozo que abra tu mesa para comenzar."}
          </span>
          {staff && table.id && (
            <Button asChild variant="ghost">
              <Link href={`/panel?vista=tables&mesa=${table.id}`}>Volver a mis mesas</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="info-banner exploration-banner">
          <div>
            <strong>Estás explorando la carta digital</strong>
            <p>
              Revisa nuestros platos y precios. Para realizar tu pedido y enviarlo a cocina, escanea el código QR ubicado en tu mesa.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/#como-pedir">
              <QrCode size={14} aria-hidden /> ¿Cómo pedir con QR?
            </Link>
          </Button>
        </div>
      )}

      {error && (
        <div role="alert" className="error-banner banner-row">
          <span>{error}</span>
          <Button variant="ghost" onClick={() => location.reload()}>
            Volver a cargar
          </Button>
        </div>
      )}

      <div className="carta-layout">
        <CategoryNav categories={categories} selected={selected} onSelect={setSelected} />

        <section className="carta-list" aria-labelledby="carta-seccion">
          <label className="search-field">
            <Search aria-hidden />
            <span className="sr-only">Buscar en la carta</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar un plato, sopa o bebida…"
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                <X aria-hidden />
              </button>
            )}
          </label>

          <div className="carta-list-head">
            <h2 id="carta-seccion">{heading}</h2>
            {!loading && (
              <span>
                {shown} {shown === 1 ? "opción" : "opciones"}
              </span>
            )}
          </div>

          {loading && <p className="empty-state">Cargando la carta…</p>}
          {!loading && !products.length && (
            <p className="empty-state">La carta todavía no tiene platos publicados.</p>
          )}
          {!loading && products.length > 0 && !shown && (
            <p className="empty-state">
              {search
                ? `No encontramos platos con «${search}».`
                : "Esta categoría no tiene platos disponibles."}
            </p>
          )}

          {sections.map(section => (
            <div key={section.id} className="carta-group">
              {selected === ALL && <h3 className="carta-group-title">{section.name}</h3>}
              {section.products.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  quantity={cart.quantityOf(p.id)}
                  disabled={busy}
                  onChange={delta => cart.change(p.id, delta)}
                />
              ))}
            </div>
          ))}
        </section>

        <OrderPanel
          items={cart.items}
          count={cart.count}
          total={cart.total}
          busy={busy}
          hasTable={Boolean(table)}
          staff={staff}
          canOrder={Boolean(table?.open)}
          onChange={cart.change}
          onNote={cart.setNote}
          checkout={
            <CheckoutForm
              tableName={table?.name ?? ""}
              staff={staff}
              busy={busy}
              onSubmit={data => void send(data)}
              onEdit={() => (cart.idempotencyKey.current = "")}
            />
          }
        />
      </div>

      <OrderBar count={cart.count} total={cart.total} target="pedido-panel" />
    </div>
  );
}
