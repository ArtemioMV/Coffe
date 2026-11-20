import { Panel } from "@/modules/administracion/panel";
import { currentUser } from "@/modules/identidad/service";

// La sesión se lee en el servidor: el panel abre con el usuario ya resuelto, sin una consulta extra al cargar.
export default async function Page({ searchParams }: { searchParams: Promise<{ vista?: string; mesa?: string }> }) {
  const [user, { vista, mesa }] = await Promise.all([currentUser(), searchParams]);
  return <Panel initialUser={user} initialTab={vista} initialTableId={mesa} />;
}
