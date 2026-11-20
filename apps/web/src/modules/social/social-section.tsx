import { connection } from "next/server";
import { Facebook, Instagram, Music2, ArrowUpRight } from "lucide-react";
import { socialSettings } from "./service";
import { socialEmbed, type SocialLinks } from "./links";
import { SocialPreview } from "./social-preview";

const profiles = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "tiktok", label: "TikTok", Icon: Music2 }
] as const;

export async function SocialSection() {
  await connection();
  const settings = await socialSettings().catch(error => {
    console.error("social_settings_unavailable", error instanceof Error ? error.name : "unknown");
    return null;
  });
  if (!settings) return null;

  const previews = [
    { key: "instagramPost", title: "Publicación de Instagram", network: "Instagram" },
    { key: "facebook", title: "Publicaciones de Facebook", network: "Facebook" },
    settings.tiktokVideo
      ? { key: "tiktokVideo", title: "Video de TikTok", network: "TikTok" }
      : { key: "tiktok", title: "Perfil de TikTok", network: "TikTok" }
  ] satisfies { key: Exclude<keyof SocialLinks, "instagram">; title: string; network: string }[];
  if ([...profiles, ...previews].every(({ key }) => !settings[key])) return null;

  return (
    <section className="posada-section social-section" aria-labelledby="social-title">
      <div className="section-header">
        <h2 id="social-title">Visita nuestras redes</h2>
      </div>
      <div className="social-profiles">
        {profiles.map(({ key, label, Icon }) => {
          const href = settings[key];
          return href && (
            <a key={key} href={href}>
              <Icon size={22} strokeWidth={1.6} aria-hidden />
              {label}
              <ArrowUpRight size={15} aria-hidden />
            </a>
          );
        })}
      </div>
      <div className="social-posts">
        {previews.map(({ key, title, network }) => {
          const href = settings[key];
          const src = href && socialEmbed(key, href);
          return href && src && <SocialPreview key={key} title={title} network={network} href={href} src={src} />;
        })}
      </div>
    </section>
  );
}
