import { Menu } from "@/modules/catalogo/menu";
export default async function Page({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  const { mesa } = await searchParams;
  return <Menu tableToken={mesa || ""} />;
}
