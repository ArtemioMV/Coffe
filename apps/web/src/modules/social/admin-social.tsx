"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@restaurant/ui";
import { api, mutation } from "@/lib/client";
import type { SocialLinks, SocialSettings } from "./links";

const fields = [
  ["facebook", "Página de Facebook"],
  ["instagram", "Perfil de Instagram"],
  ["tiktok", "Perfil de TikTok"],
  ["instagramPost", "Publicación pública de Instagram"],
  ["tiktokVideo", "Video público de TikTok"]
] as const satisfies ReadonlyArray<readonly [keyof SocialLinks, string]>;

export function AdminSocial({ busy, onError, run }: {
  busy: boolean;
  onError: (error: unknown) => void;
  run: (task: () => Promise<unknown>) => Promise<void>;
}) {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "error" | "ready">("loading");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loadStatus !== "loading") return;
    let active = true;
    api<{ settings: SocialSettings }>("admin/social").then(result => {
      if (!active) return;
      setSettings(result.settings);
      setLoadStatus("ready");
    }).catch(error => {
      if (!active) return;
      setLoadStatus("error");
      onError(error);
    });
    return () => { active = false; };
  }, [loadStatus, onError]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run(async () => {
      const result = await mutation<{ settings: SocialSettings }>("admin/social", { ...values, version: settings.version }, "PUT");
      setSettings(result.settings);
      setSaved(true);
    });
  }

  if (loadStatus === "error") return <Button type="button" onClick={() => setLoadStatus("loading")}>Reintentar carga</Button>;
  if (!settings) return <p role="status">Cargando redes sociales…</p>;

  return (
    <section className="surface">
      <h2>Perfiles y publicaciones de portada</h2>
      <p>Pega enlaces públicos completos. Si dejas vacío el video de TikTok, se muestra el perfil.</p>
      <form className="form-grid" onSubmit={save} onChange={() => setSaved(false)} key={settings.version}>
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input name={key} type="url" maxLength={512} defaultValue={settings[key] ?? ""} disabled={busy} />
          </label>
        ))}
        <div>
          <Button type="submit" disabled={busy}>Guardar redes sociales</Button>
        </div>
      </form>
      <p role="status">{saved ? "Redes sociales guardadas." : ""}</p>
    </section>
  );
}
