<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/helpers.php';

if (!is_logged_in()) {
    flash_set('after_login', '/checkout.php');
    redirect('/login.php');
}

$user = current_user();
$page = 'checkout';
$title = 'Confirmar pedido · UKUMARI';
require __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="container">
    <div class="section-title">
      <span class="script">Último paso</span>
      <h2>Confirmar pedido</h2>
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        <div class="cart-card">
          <h5 class="mb-3"><i class="bi bi-receipt"></i> Detalle del pedido</h5>
          <div id="checkoutItems"></div>
        </div>

        <div class="cart-card mt-3">
          <h5 class="mb-3"><i class="bi bi-truck"></i> Tipo de pedido</h5>
          <form id="checkoutForm">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Tipo</label>
                <select class="form-select" name="tipo_pedido" required>
                  <option value="recojo">Recojo en tienda</option>
                  <option value="mesa">Para mesa</option>
                  <option value="delivery">Delivery (simulado)</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Método de pago</label>
                <select class="form-select" name="metodo_pago" required>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="yape">Yape / Plin</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Observaciones</label>
                <textarea name="observaciones" class="form-control" rows="2"
                          placeholder="Ej. sin azúcar, leche de almendras…"></textarea>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="summary-card">
          <h5>Resumen</h5>
          <div class="small mb-3" style="color:#f0d8b3">
            <i class="bi bi-person-circle"></i> <?= e($user['nombre']) ?> · <?= e($user['correo']) ?>
          </div>
          <div id="summaryLines"></div>
          <button class="btn btn-gold w-100 mt-3" id="confirmBtn">
            <i class="bi bi-check2-circle"></i> Confirmar pedido
          </button>
          <a href="/carrito.php" class="btn btn-link w-100 mt-2" style="color:#f0d8b3">
            <i class="bi bi-arrow-left"></i> Volver al carrito
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<script>
function money(n){ return 'S/ ' + Number(n).toFixed(2); }
const csrf = '<?= e(csrf_token()) ?>';

function render() {
  const { items, base, igv, total } = Cart.totals();
  const wrap = document.getElementById('checkoutItems');
  const sumW = document.getElementById('summaryLines');
  if (!items.length) {
    wrap.innerHTML = '<div class="text-center text-muted py-4">Tu carrito está vacío. <a href="/carta.php">Ver carta</a></div>';
    sumW.innerHTML = '';
    document.getElementById('confirmBtn').disabled = true;
    return;
  }
  wrap.innerHTML = items.map(it => `
    <div class="d-flex justify-content-between py-2 border-bottom">
      <div>
        <strong>${it.nombre}</strong>
        <div class="text-muted small">${it.qty} × ${money(it.precio)}</div>
        ${it.obs ? `<div class="small text-uku fst-italic"><i class="bi bi-pencil"></i> ${it.obs.replace(/[<>]/g,'')}</div>` : ''}
      </div>
      <div><strong>${money(it.qty * it.precio)}</strong></div>
    </div>
  `).join('');
  sumW.innerHTML = `
    <div class="summary-line"><span>Subtotal</span><span>${money(base)}</span></div>
    <div class="summary-line"><span>IGV (18%)</span><span>${money(igv)}</span></div>
    <div class="summary-line summary-total"><span>Total</span><span>${money(total)}</span></div>
  `;
}

document.getElementById('confirmBtn').addEventListener('click', async () => {
  const { items, total } = Cart.totals();
  if (!items.length) return;

  const form = document.getElementById('checkoutForm');
  const fd = new FormData(form);
  const payload = {
    _csrf: csrf,
    tipo_pedido: fd.get('tipo_pedido'),
    metodo_pago: fd.get('metodo_pago'),
    observaciones: fd.get('observaciones') || null,
    items: items.map(i => ({ producto_id: i.id, cantidad: i.qty, observacion: i.obs || null }))
  };

  Swal.fire({ title:'Procesando…', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
  try {
    const r = await fetch('/api/pedido_crear.php', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || 'Error al confirmar');
    Cart.clear();
    Swal.fire({
      icon:'success',
      title:'¡Pedido confirmado!',
      html: `<p>N° de pedido: <b>#${j.pedido_id}</b><br>Total: <b>${money(j.total)}</b></p>
             <p class="text-muted small">Te avisaremos cuando esté listo.</p>`,
      confirmButtonText:'Ir al inicio',
      confirmButtonColor:'#a47a44'
    }).then(()=>location.href='/');
  } catch (e) {
    Swal.fire({ icon:'error', title:'No se pudo confirmar', text:e.message });
  }
});

document.addEventListener('DOMContentLoaded', render);
</script>

<?php require __DIR__ . '/includes/footer.php'; ?>
