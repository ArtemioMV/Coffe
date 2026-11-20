import { db } from "@restaurant/database";
import { currentUser } from "@/modules/identidad/service";
import { failure, assert } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    assert(user, 401, "Inicia sesión");
    const encoder = new TextEncoder();
    let cursor = Number(request.headers.get("last-event-id") || new URL(request.url).searchParams.get("after") || 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) cursor = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const stream = new ReadableStream({
      async start(controller) {
        const stop = () => { stopped = true; if (timer) clearTimeout(timer); };
        request.signal.addEventListener("abort", stop, { once: true });
        const tick = async () => {
          if (stopped) { try { controller.close(); } catch {} return; }
          try {
            // La conexión dura como máximo 60 segundos; la reconexión vuelve a validar sesión.
            if (Date.now() - started > 60_000) { stop(); controller.close(); return; }
            const records = await db.notification.findMany({ where: { userId: user.id, sequence: { gt: cursor } }, orderBy: { sequence: "asc" }, take: 100 });
            for (const record of records) {
              cursor = record.sequence;
              controller.enqueue(encoder.encode(`id: ${cursor}\ndata: ${JSON.stringify(record)}\n\n`));
            }
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
            timer = setTimeout(tick, 1500);
          } catch { stop(); try { controller.close(); } catch {} }
        };
        await tick();
      },
      cancel() { stopped = true; if (timer) clearTimeout(timer); }
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (e) { return failure(e); }
}
