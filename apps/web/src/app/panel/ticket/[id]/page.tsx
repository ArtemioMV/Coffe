import { Ticket, type TicketData } from "@/modules/caja/ticket";
import { ticketData } from "@/modules/caja/service";
import { currentUser } from "@/modules/identidad/service";
import { HttpError } from "@/lib/http";

const types = ["precuenta", "comanda", "ticket"];

// El documento se arma en el servidor: llega listo para imprimir, sin esperar a otra consulta desde el navegador.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }) {
  const [{ id }, { tipo }, user] = await Promise.all([params, searchParams, currentUser()]);
  const type = tipo && types.includes(tipo) ? tipo : "precuenta";
  if (!user) return <Ticket type={type} error="Tu sesión terminó. Vuelve a ingresar desde el panel." />;
  try {
    const data = JSON.parse(JSON.stringify(await ticketData(id, user))) as TicketData;
    return <Ticket type={type} data={data} />;
  } catch (e) {
    if (e instanceof HttpError) return <Ticket type={type} error={e.message} />;
    throw e;
  }
}
