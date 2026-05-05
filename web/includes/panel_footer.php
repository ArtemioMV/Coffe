  </main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
const PANEL_CSRF = '<?= e(csrf_token()) ?>';

// Polling de pedidos listos para mesero/admin
(function() {
  const bell = document.getElementById('readyBell');
  const badge = document.getElementById('readyBadge');
  if (!bell || !badge) return;
  let knownIds = new Set();
  let firstRun = true;

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
      o.stop(ctx.currentTime + 0.25);
    } catch(_) {}
  }

  async function poll() {
    try {
      const r = await fetch('/api/pedidos_listos.php', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) return;
      badge.textContent = j.count;
      badge.style.display = j.count > 0 ? 'inline-block' : 'none';
      bell.classList.toggle('bell-ring', j.count > 0);

      const currentIds = new Set(j.items.map(x => x.id));
      if (!firstRun) {
        const nuevos = j.items.filter(x => !knownIds.has(x.id));
        if (nuevos.length) {
          beep();
          if (window.Swal) {
            const list = nuevos.map(x => `#${x.id}${x.mesa ? ' · Mesa ' + x.mesa : ''}`).join('<br>');
            Swal.fire({
              toast: true, position: 'top-end',
              icon: 'success',
              title: nuevos.length === 1 ? 'Pedido listo para entregar' : `${nuevos.length} pedidos listos`,
              html: `<div class="small">${list}</div>`,
              showConfirmButton: false, timer: 5000, timerProgressBar: true
            });
          }
        }
      }
      knownIds = currentIds;
      firstRun = false;
    } catch(_) { /* silencioso */ }
  }
  poll();
  setInterval(poll, 15000);
})();

async function cambiarEstado(pedidoId, estadoId, label) {
  const r = await Swal.fire({
    title: `¿Marcar como "${label}"?`,
    icon:'question', showCancelButton:true,
    confirmButtonText:'Sí, cambiar', cancelButtonText:'Cancelar',
    confirmButtonColor:'#a47a44'
  });
  if (!r.isConfirmed) return;
  const fd = new FormData();
  fd.append('_csrf', PANEL_CSRF);
  fd.append('pedido_id', pedidoId);
  fd.append('estado_id', estadoId);
  const res = await fetch('/api/pedido_estado.php', { method:'POST', body: fd });
  const j = await res.json();
  if (j.ok) location.reload();
  else Swal.fire('Error', j.msg || 'No se pudo cambiar', 'error');
}
</script>
</body>
</html>
