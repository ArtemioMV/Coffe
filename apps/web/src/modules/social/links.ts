export type SocialLinks = {
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  instagramPost: string | null;
  tiktokVideo: string | null;
};

export type SocialSettings = SocialLinks & { version: number };

const instagramPostPath = /^(?:\/[\w.]+)?(\/(?:p|reel)\/[\w-]+)\/?$/;
const tiktokVideoPath = /^\/@[\w.-]+\/video\/(\d{15,21})\/?$/;

const fields = {
  facebook: { hosts: ["facebook.com", "www.facebook.com", "web.facebook.com"], path: /^\/[\w.-]+\/?$/ },
  instagram: { hosts: ["instagram.com", "www.instagram.com"], path: /^\/[\w.]+\/?$/ },
  tiktok: { hosts: ["tiktok.com", "www.tiktok.com"], path: /^\/@[\w.-]+\/?$/ },
  instagramPost: { hosts: ["instagram.com", "www.instagram.com"], path: instagramPostPath },
  tiktokVideo: { hosts: ["tiktok.com", "www.tiktok.com"], path: tiktokVideoPath }
};

export function parseSocialUrl(key: keyof SocialLinks, value: string) {
  const url = URL.parse(value);
  const { hosts, path } = fields[key];
  if (!url || url.protocol !== "https:" || url.port || url.username || url.password ||
    !hosts.includes(url.hostname) || !path.test(url.pathname)) return null;
  const pathname = key === "instagramPost" ? `${instagramPostPath.exec(url.pathname)![1]}/` : url.pathname;
  return `https://${hosts[1]}${pathname}`;
}

export function socialEmbed(key: "instagramPost" | "tiktokVideo", value: string) {
  const source = parseSocialUrl(key, value);
  if (!source) return null;

  const { pathname } = new URL(source);
  if (key === "instagramPost") return `https://www.instagram.com${pathname.replace(/\/$/, "")}/embed/`;
  return `https://www.tiktok.com/player/v1/${tiktokVideoPath.exec(pathname)![1]}`;
}
