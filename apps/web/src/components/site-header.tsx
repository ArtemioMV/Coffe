import Image from "next/image";
import Link from "next/link";
import { brandLogo } from "@/lib/brand";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Image src={brandLogo} width={44} height={44} alt="" priority />
        <span>La Posada<small>Cajamarquina</small></span>
      </Link>
      <SiteNav />
    </header>
  );
}
