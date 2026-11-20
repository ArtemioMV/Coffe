"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, MessageSquare, UserRound, UtensilsCrossed, X } from "lucide-react";
import { api, mutation, SESSION_EVENT, type User } from "@/lib/client";

type NavUser = Pick<User, "name" | "role">;

const panelLabel: Record<NavUser["role"], string> = {
  ADMIN: "Administración",
  WAITER: "Mis mesas",
  KITCHEN: "Cocina",
  CASHIER: "Caja",
  CUSTOMER: "Mis pedidos",
};

/** Navegación pública. La sesión se consulta en el cliente para que las páginas públicas sigan siendo estáticas. */
export function SiteNav() {
  const [user, setUser] = useState<NavUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const close = () => setOpen(false);
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  // Se vuelve a consultar al cambiar de página y cuando el panel avisa que se ingresó o se salió.
  useEffect(() => {
    let active = true;
    const load = () =>
      api<{ user: User | null }>("auth/me")
        .then(r => active && setUser(r.user))
        .catch(() => active && setUser(null));
    load();
    window.addEventListener(SESSION_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EVENT, load);
    };
  }, [pathname]);

  async function logout() {
    setLeaving(true);
    try {
      await mutation("auth/logout", {});
    } finally {
      setLeaving(false);
      setUser(null);
      close();
      window.dispatchEvent(new Event(SESSION_EVENT));
      router.push("/");
    }
  }

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="menu-principal"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>

      <nav id="menu-principal" aria-label="Navegación principal" className={open ? "site-nav open" : "site-nav"}>
        <Link href="/carta" aria-current={current("/carta")} onClick={close}>
          <UtensilsCrossed aria-hidden /> Carta
        </Link>
        <Link href="/sugerencias" aria-current={current("/sugerencias")} onClick={close}>
          <MessageSquare aria-hidden /> Sugerencias
        </Link>

        {user ? (
          <>
            <Link href="/panel" aria-current={current("/panel")} onClick={close}>
              <LayoutDashboard aria-hidden /> {panelLabel[user.role]}
            </Link>
            <span className="nav-user" title={user.name}>
              <UserRound aria-hidden /> <span>{user.name.split(" ")[0]}</span>
            </span>
            <button type="button" className="nav-logout" onClick={() => void logout()} disabled={leaving}>
              <LogOut aria-hidden /> Salir
            </button>
          </>
        ) : user === undefined ? (
          <span className="nav-account-placeholder" aria-hidden />
        ) : (
          <Link href="/panel" className="nav-account" aria-current={current("/panel")} onClick={close}>
            <UserRound aria-hidden /> Mi cuenta
          </Link>
        )}
      </nav>
    </>
  );
}
