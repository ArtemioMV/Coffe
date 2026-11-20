"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@restaurant/ui";

export function SocialPreview({ label, src, href }: { label: string; src: string; href: string }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="social-preview">
      {open ? (
        <iframe
          className="social-frame"
          title={label}
          src={src}
          allow="fullscreen; encrypted-media"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>Cargar {label}</Button>
      )}
      <a className="review-link" href={href}>Abrir publicación <ExternalLink size={14} aria-hidden /></a>
    </article>
  );
}
