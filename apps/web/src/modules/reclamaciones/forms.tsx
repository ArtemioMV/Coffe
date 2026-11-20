"use client";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, MessageSquare, Printer, Sparkles } from "lucide-react";
import { Button } from "@restaurant/ui";
import { api, mutation, dateTime } from "@/lib/client";

export function FeedbackForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <span className="eyebrow">TU VOZ TIENE UN LUGAR · LA POSADA CAJAMARQUINA</span>
        <h1>Te escuchamos</h1>
        <p>Las buenas ideas también se comparten en la mesa. Déjanos tus sugerencias para seguir mejorando.</p>
      </div>

      <section className="surface">
        {sent ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <CheckCircle2 size={28} aria-hidden style={{ margin: "0 auto .5rem", display: "block" }} />
            <h2 style={{ marginBottom: "0.5rem" }}>
              ¡Muchas gracias por tu sugerencia!
            </h2>
            <p style={{ maxWidth: "460px", margin: "0 auto 1.5rem" }}>
              La hemos guardado con mucho aprecio para que todo nuestro equipo pueda revisarla.
            </p>
            <Button variant="outline" onClick={() => setSent(false)}>
              Enviar otra sugerencia
            </Button>
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              mutation("suggestions", values)
                .then(() => setSent(true))
                .catch(e => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            {error && <p className="error-banner" role="alert">{error}</p>}

            <label>
              Tu sugerencia
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={4000}
                placeholder="¿Qué plato te gustaría ver en la carta? ¿Cómo podemos hacer tu visita aún más placentera?"
              />
            </label>

            <label>
              Correo (opcional)
              <input
                name="contact"
                type="email"
                maxLength={200}
                placeholder="Para poder darte las gracias o responderte si lo deseas"
              />
            </label>

            <p className="small-note" style={{ padding: "0.75rem 1rem", margin: "1rem 0" }}>
              Puedes enviar tu sugerencia de forma anónima. Para presentar un reclamo o queja formal según ley peruana, utiliza el{" "}
              <a className="text-link" href="/libro-de-reclamaciones">
                Libro de Reclamaciones
              </a>.
            </p>

            <Button className="button-primary full-width" disabled={busy}>
              {busy ? "Enviando…" : "Compartir sugerencia"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

type Provider = { name: string; ruc: string; address: string };
type Receipt = {
  number: number;
  kind: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  representative: string;
  service: string;
  amount: string | null;
  detail: string;
  request: string;
  createdAt: string;
  status: string;
  response: string | null;
  provider: Provider;
};

export function ClaimForm() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    api<Provider>("business").then(setProvider).catch(e => setError(e.message));
    const hash = location.hash.slice(1).split("/");
    if (hash.length === 2) void loadReceipt(hash[0], hash[1]);
  }, []);

  async function loadReceipt(id: string, access: string) {
    setLink(`${location.origin}/libro-de-reclamaciones#${id}/${access}`);
    try {
      setReceipt(await api<Receipt>(`claims/${id}`, { headers: { Authorization: `Bearer ${access}` } }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const configured = provider?.name && /^\d{11}$/.test(provider.ruc) && provider.address;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await mutation<{ id: string; number: number; access: string }>(
        "claims",
        Object.fromEntries(new FormData(e.currentTarget))
      );
      history.replaceState(null, "", `#${result.id}/${result.access}`);
      await loadReceipt(result.id, result.access);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <span className="eyebrow">ATENCIÓN AL CONSUMIDOR · INDECOPI PERÚ</span>
        <h1>Libro de Reclamaciones</h1>
        <p>Presenta tu reclamo o queja virtual de forma directa, sin necesidad de crear una cuenta.</p>
      </div>

      {error && <p role="alert" className="error-banner">{error}</p>}

      {receipt ? (
        <section className="surface claim-receipt">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <BookOpen size={28} />
            <h2 style={{ margin: 0 }}>Constancia · Hoja #{receipt.number}</h2>
          </div>

          <div style={{ padding: "0.8rem 1rem", marginBottom: "1.5rem" }}>
            <strong>{receipt.provider.name}</strong> · RUC {receipt.provider.ruc}
            <br />
            {receipt.provider.address}
          </div>

          <p>
            Registrado el {dateTime(receipt.createdAt)} · Tipo: <strong>{receipt.kind}</strong> · Estado: {receipt.status}
          </p>

          <h3 style={{ marginTop: "1.5rem", paddingBottom: "0.4rem" }}>Identificación del consumidor</h3>
          <p>
            <strong>{receipt.name}</strong> · Documento {receipt.document}
            <br />
            Correo: {receipt.email} {receipt.phone && `· Teléfono: ${receipt.phone}`}
            <br />
            Dirección: {receipt.address}
          </p>
          {receipt.representative && <p>Representante: {receipt.representative}</p>}

          <h3 style={{ marginTop: "1.5rem", paddingBottom: "0.4rem" }}>Bien o servicio contratado</h3>
          <p>
            {receipt.service} {receipt.amount && `· Monto reclamado: S/ ${receipt.amount}`}
          </p>

          <h3 style={{ marginTop: "1.5rem", paddingBottom: "0.4rem" }}>Detalle del reclamo o queja</h3>
          <p className="preserve-text" style={{ padding: "0.8rem" }}>{receipt.detail}</p>

          <h3 style={{ marginTop: "1.5rem", paddingBottom: "0.4rem" }}>Pedido del consumidor</h3>
          <p className="preserve-text" style={{ padding: "0.8rem" }}>{receipt.request}</p>

          {receipt.response && (
            <>
              <h3 style={{ marginTop: "1.5rem", paddingBottom: "0.4rem" }}>Respuesta del establecimiento</h3>
              <p className="preserve-text" style={{ padding: "0.8rem" }}>{receipt.response}</p>
            </>
          )}

          <div className="print-controls" style={{ marginTop: "2rem", paddingTop: "1.5rem" }}>
            <Button onClick={() => window.print()} className="button-primary">
              <Printer size={16} /> Imprimir / guardar constancia en PDF
            </Button>
            <label style={{ marginTop: "1.2rem" }}>
              Enlace privado de seguimiento
              <input readOnly value={link} onFocus={e => e.target.select()} />
            </label>
            <p className="small-note">
              Conserva este enlace en tus favoritos. Permite consultar el estado de tu hoja y contiene una clave de acceso privado; no lo compartas.
            </p>
          </div>
        </section>
      ) : (
        <>
          {provider && (
            <section className="surface">
              <span className="eyebrow">ESTABLECIMIENTO</span>
              <h2 style={{ marginBottom: "0.4rem" }}>{provider.name || "La Posada Cajamarquina"}</h2>
              <p style={{ margin: 0 }}>
                RUC: {provider.ruc || "Pendiente"} · Dirección: {provider.address || "Cajamarca, Perú"}
              </p>
            </section>
          )}

          {provider && !configured && (
            <p className="error-banner" role="alert">
              Falta configurar la identificación fiscal del establecimiento para habilitar el registro virtual. Solicita el Libro físico al personal.
            </p>
          )}

          <section className="surface">
            <form onSubmit={submit}>
              <fieldset disabled={!configured || busy} style={{ padding: 0, margin: 0 }}>
                <legend style={{ marginBottom: "1.2rem" }}>
                  1. Identificación del consumidor
                </legend>

                <div className="form-grid">
                  <label>
                    Nombre completo
                    <input name="name" required minLength={3} maxLength={150} autoComplete="name" />
                  </label>
                  <label>
                    Documento de identidad
                    <input name="document" required minLength={5} maxLength={20} placeholder="DNI, CE o Pasaporte" />
                  </label>
                  <label>
                    Correo para respuesta
                    <input name="email" type="email" required autoComplete="email" />
                  </label>
                  <label>
                    Teléfono (opcional)
                    <input name="phone" maxLength={30} autoComplete="tel" />
                  </label>
                </div>

                <label>
                  Dirección
                  <input name="address" required minLength={5} maxLength={300} autoComplete="street-address" />
                </label>

                <label>
                  Representante, cuando corresponda
                  <input name="representative" maxLength={300} placeholder="Nombre del apoderado o tutor (opcional)" />
                </label>

                <h2 style={{ marginTop: "2rem", marginBottom: "1.2rem" }}>
                  2. Tu hoja de reclamación
                </h2>

                <label>
                  Tipo
                  <select name="kind">
                    <option value="RECLAMO">Reclamo: disconformidad con el producto o servicio</option>
                    <option value="QUEJA">Queja: disconformidad con la atención recibida</option>
                  </select>
                </label>

                <label>
                  Bien o servicio contratado
                  <textarea name="service" required minLength={3} maxLength={1000} placeholder="Describe el plato consumido, bebida o servicio del restaurante" />
                </label>

                <label>
                  Monto reclamado, si corresponde (S/)
                  <input name="amount" type="number" min="0" step="0.01" placeholder="0.00" />
                </label>

                <label>
                  Detalle del reclamo o queja
                  <textarea name="detail" required minLength={10} maxLength={4000} placeholder="Explica claramente lo sucedido con fecha y hora estimada" />
                </label>

                <label>
                  Pedido del consumidor
                  <textarea name="request" required minLength={5} maxLength={4000} placeholder="¿Qué solución esperas de parte del restaurante?" />
                </label>

                <p className="small-note" style={{ padding: "0.8rem 1rem", margin: "1.2rem 0" }}>
                  Usaremos estos datos para atender tu hoja en un plazo máximo de 15 días hábiles conforme a ley. La presentación no impide acudir a otras vías de solución.
                </p>

                <Button type="submit" className="button-primary full-width" disabled={!configured || busy}>
                  {busy ? "Registrando hoja…" : "Registrar hoja y obtener constancia"}
                </Button>
              </fieldset>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
