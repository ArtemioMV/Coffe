import { brandLogo, brandName } from "@/lib/brand";

export type Slide = {
  id: string;
  tone: "granate" | "verde" | "dorado";
  eyebrow: string;
  title: string;
  text: string;
  action: { href: string; label: string };
  secondary?: { href: string; label: string };
  /**
   * Foto propia del local o de los platos. Guárdala en `apps/web/public/carrusel/`
   * y escribe aquí, por ejemplo, `{ src: "/carrusel/terraza.jpg", alt: "Terraza al atardecer" }`.
   * No usar fotos de otros negocios ni imágenes generadas presentadas como reales (docs/DISENO.md).
   */
  image?: { src: string; alt: string };
};

export const slides: Slide[] = [
  {
    id: "bienvenida",
    tone: "granate",
    eyebrow: "Cajamarca, Perú",
    title: brandName,
    text: "Cocina típica cajamarquina para compartir en una mesa de campo, preparada al momento.",
    action: { href: "/carta", label: "Ver la carta" },
    image: { src: brandLogo, alt: `Emblema de ${brandName}` },
  },
  {
    id: "pedido-en-mesa",
    tone: "verde",
    eyebrow: "Desde tu teléfono",
    title: "Pide desde tu mesa",
    text: "Escanea el QR de tu mesa, elige tus platos y tu mozo confirma el pedido antes de enviarlo a cocina.",
    action: { href: "/#como-pedir", label: "Cómo funciona" },
  },
  {
    id: "opinion",
    tone: "dorado",
    eyebrow: "Te escuchamos",
    title: "Cuéntanos cómo te fue",
    text: "Déjanos una sugerencia o valora tu visita. El Libro de Reclamaciones también está disponible en línea.",
    action: { href: "/sugerencias", label: "Dejar una sugerencia" },
    secondary: { href: "/libro-de-reclamaciones", label: "Libro de Reclamaciones" },
  },
];
