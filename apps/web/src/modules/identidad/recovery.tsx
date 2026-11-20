"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@restaurant/ui";
import { mutation } from "@/lib/client";

export function Recovery() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(location.hash.slice(1));
    history.replaceState(null, "", location.pathname);
  }, []);

  return (
    <div className="page-shell narrow">
      <div className="page-heading" style={{ textAlign: "center" }}>
        <div style={{ width: "54px", height: "54px", display: "grid", placeItems: "center", margin: "0 auto 1rem" }}>
          <KeyRound size={26} />
        </div>
        <span className="eyebrow">VOLVAMOS A ENCONTRARNOS · RECUPERACIÓN</span>
        <h1>Recupera tu acceso</h1>
        <p>Ingresa tu correo para recibir un enlace seguro de restablecimiento.</p>
      </div>

      <section className="surface" style={{ maxWidth: "460px", margin: "0 auto" }}>
        {error && <p className="error-banner" role="alert">{error}</p>}
        {message ? (
          <div style={{ padding: "1.2rem" }}>
            <p role="status" style={{ margin: 0 }}>{message}</p>
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const data = Object.fromEntries(new FormData(e.currentTarget));
              mutation<{ message: string }>(token ? "auth/reset" : "auth/forgot", { ...data, token })
                .then(r => setMessage(r.message))
                .catch(e => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            {token ? (
              <label>
                Nueva contraseña
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={100}
                  placeholder="Mínimo 10 caracteres"
                />
              </label>
            ) : (
              <label>
                Correo de tu cuenta
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="ejemplo@restaurante.test"
                />
              </label>
            )}

            <Button className="button-primary full-width" disabled={busy}>
              {busy ? "Tramitando…" : token ? "Guardar contraseña" : "Solicitar enlace"}
            </Button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "1.5rem", paddingTop: "1rem" }}>
          <Link href="/panel" className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <ArrowLeft size={16} /> Volver a mi cuenta
          </Link>
        </p>
      </section>
    </div>
  );
}
