import { db } from "@restaurant/database";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import { serial } from "@/modules/pedidos/service";
import { parseSocialUrl, type SocialLinks } from "./links";

function link(key: keyof SocialLinks, label: string) {
  return z.string().trim().max(512).transform((value, context) => {
    if (!value) return null;
    const url = parseSocialUrl(key, value);
    if (url) return url;
    context.addIssue({ code: "custom", message: `Ingresa el enlace completo de ${label} (https://).` });
    return z.NEVER;
  });
}

export const socialInput = z.object({
  facebook: link("facebook", "Facebook"),
  instagram: link("instagram", "Instagram"),
  tiktok: link("tiktok", "TikTok"),
  instagramPost: link("instagramPost", "la publicación de Instagram"),
  tiktokVideo: link("tiktokVideo", "el video de TikTok"),
  version: z.number().int().nonnegative()
});

const select = { facebook: true, instagram: true, tiktok: true, instagramPost: true, tiktokVideo: true, version: true } as const;

export function socialSettings() {
  return db.siteSocial.findUniqueOrThrow({ where: { id: 1 }, select });
}

export function updateSocial({ version, ...links }: z.output<typeof socialInput>, actorId: string) {
  return serial(async tx => {
    const updated = await tx.siteSocial.updateMany({
      where: { id: 1, version },
      data: { ...links, version: { increment: 1 } }
    });
    if (!updated.count) throw new HttpError(409, "Otra sesión cambió las redes. Vuelve a abrir esta sección antes de guardar.");
    await tx.auditLog.create({ data: { actorId, action: "social.update", resource: "site" } });
    return tx.siteSocial.findUniqueOrThrow({ where: { id: 1 }, select });
  });
}
