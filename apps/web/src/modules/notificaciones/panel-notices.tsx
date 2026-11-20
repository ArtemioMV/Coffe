import { Button } from "@restaurant/ui";
import { dateTime, type Notice } from "@/lib/client";

export function PanelNotices({ notices, onRead, busy }: {
  notices: Notice[];
  onRead: (id: string) => void;
  busy: boolean;
}) {
  return (
    <section id="notificaciones" className="surface notice-list" aria-labelledby="notificaciones-titulo">
      <h2 id="notificaciones-titulo">Notificaciones</h2>
      {!notices.length && <p>No hay notificaciones todavía.</p>}
      {notices.map(notice => (
        <article key={notice.id} className={notice.readAt || notice.acknowledgedAt ? "notice read" : "notice"}>
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
            <small>{dateTime(notice.createdAt)}</small>
          </div>
          {notice.acknowledgedAt ? (
            <span className="badge">Resuelto</span>
          ) : !notice.readAt && (
            <Button variant="ghost" onClick={() => onRead(notice.id)} disabled={busy}>
              Marcar leído
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
