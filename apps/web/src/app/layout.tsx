import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brandLogo, brandName } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: brandName, template: `%s · ${brandName}` },
  description: "Restaurante campestre en Cajamarca, Perú. Cocina tradicional y pedidos desde tu mesa.",
  icons: { icon: brandLogo },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <a href="#contenido" className="skip-link">Ir al contenido</a>
        <SiteHeader />
        <main id="contenido">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
