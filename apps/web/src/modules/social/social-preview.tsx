import { ExternalLink } from "lucide-react";

export function SocialPreview({ title, network, src, href }: {
  title: string;
  network: string;
  src: string;
  href: string;
}) {
  return (
    <article className="social-preview">
      <iframe
        className="social-frame"
        title={title}
        src={src}
        loading="lazy"
        allow="fullscreen; encrypted-media"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <a className="site-text-link" href={href}>Ver en {network} <ExternalLink aria-hidden /></a>
    </article>
  );
}
