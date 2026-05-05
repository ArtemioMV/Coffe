<?php
$page = 'carrito';
$title = 'Carrito · UKUMARI';
require __DIR__ . '/includes/header.php';
?>
<script>
window.UKU = {
  waNumber: '<?= e(WHATSAPP_NUMBER) ?>',
  waDisplay: '<?= e(WHATSAPP_DISPLAY) ?>',
  appName: 'UKUMARI'
};
</script>

<section class="section">
  <div class="container">
    <div class="section-title">
      <span class="script">Tu pedido</span>
      <h2>Carrito</h2>
    </div>

    <div class="row g-4" id="cartView">
      <!-- contenido renderizado por JS -->
    </div>
  </div>
</section>

<template id="emptyTpl">
  <div class="col-12 text-center py-5">
    <i class="bi bi-bag-x" style="font-size:3rem;color:var(--uku-gold-dark)"></i>
    <h4 class="mt-3">Tu carrito está vacío</h4>
    <p class="text-muted">Explora nuestra carta y agrega tus favoritos.</p>
    <a href="/carta.php" class="btn btn-uku"><i class="bi bi-journal-text"></i> Ver carta</a>
  </div>
</template>

<script>
function renderCart() {
  const view = document.getElementById('cartView');
  const { items, base, igv, total } = Cart.totals();
  view.innerHTML = '';

  if (!items.length) {
    view.appendChild(document.getElementById('emptyTpl').content.cloneNode(true));
    return;
  }

  const left = document.createElement('div');
  left.className = 'col-lg-8';
  const card = document.createElement('div');
  card.className = 'cart-card';
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = 'cart-row flex-wrap';
    const obsVal = (it.obs || '').replace(/"/g, '&quot;');
    row.innerHTML = `
      <div class="flex-grow-1" style="min-width:200px">
        <div class="cr-name">${it.nombre}</div>
        <div class="cr-meta">${money(it.precio)} c/u</div>
      </div>
      <div class="qty-ctrl">
        <button data-act="dec">−</button>
        <span>${it.qty}</span>
        <button data-act="inc">+</button>
      </div>
      <div class="text-end" style="min-width:90px">
        <strong>${money(it.precio * it.qty)}</strong>
      </div>
      <button class="btn btn-link text-danger ms-2" title="Eliminar" data-act="del">
        <i class="bi bi-trash"></i>
      </button>
      <div class="w-100 mt-2">
        <input type="text" class="form-control form-control-sm cr-obs"
               maxlength="200"
               placeholder="Personalización: tamaño, sin azúcar, leche de almendras…"
               value="${obsVal}">
      </div>
    `;
    row.querySelector('[data-act=inc]').onclick = () => { Cart.setQty(it.id, it.qty + 1); renderCart(); };
    row.querySelector('[data-act=dec]').onclick = () => { Cart.setQty(it.id, it.qty - 1); renderCart(); };
    row.querySelector('[data-act=del]').onclick = () => {
      Swal.fire({
        title: '¿Eliminar producto?', text: it.nombre,
        icon: 'warning', showCancelButton: true,
        confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
        confirmButtonColor: '#a47a44'
      }).then(r => { if (r.isConfirmed) { Cart.remove(it.id); renderCart(); } });
    };
    const obsInput = row.querySelector('.cr-obs');
    let obsT;
    obsInput.addEventListener('input', () => {
      clearTimeout(obsT);
      obsT = setTimeout(() => Cart.setObs(it.id, obsInput.value), 300);
    });
    card.appendChild(row);
  });
  left.appendChild(card);

  const right = document.createElement('div');
  right.className = 'col-lg-4';
  right.innerHTML = `
    <div class="summary-card">
      <h5>Resumen del pedido</h5>
      <div class="summary-line"><span>Subtotal</span><span>${money(base)}</span></div>
      <div class="summary-line"><span>IGV (18%)</span><span>${money(igv)}</span></div>
      <div class="summary-line summary-total"><span>Total</span><span>${money(total)}</span></div>
      <a href="/checkout.php" class="btn btn-gold w-100 mt-3"><i class="bi bi-arrow-right-circle"></i> Continuar pedido</a>
      <button class="btn-wa w-100 mt-2 justify-content-center" onclick="pedirPorWhatsApp()">
        <i class="bi bi-whatsapp"></i> Pedir por WhatsApp
      </button>
      <button class="btn btn-link w-100 mt-2" style="color:#f0d8b3" onclick="vaciarCarrito()">Vaciar carrito</button>
    </div>
  `;

  view.appendChild(left);
  view.appendChild(right);
}

function money(n){ return 'S/ ' + Number(n).toFixed(2); }
function vaciarCarrito(){
  Swal.fire({ title:'¿Vaciar carrito?', icon:'question', showCancelButton:true,
              confirmButtonText:'Sí, vaciar', cancelButtonText:'No',
              confirmButtonColor:'#a47a44' })
    .then(r=>{ if(r.isConfirmed){ Cart.clear(); renderCart(); }});
}

function pedirPorWhatsApp(){
  const { items, base, igv, total } = Cart.totals();
  if (!items.length) {
    Swal.fire('Tu carrito está vacío', 'Agrega productos antes de enviar', 'info');
    return;
  }
  Swal.fire({
    title:'Enviar pedido por WhatsApp',
    html: `
      <div class="wa-order-form text-start">
        <label class="form-label small">Tu nombre</label>
        <input id="waName" class="form-control" placeholder="¿Cómo te llamas?">
        <label class="form-label small mt-2">Tipo de pedido</label>
        <select id="waTipo" class="form-select">
          <option value="recojo">Recojo en tienda</option>
          <option value="delivery">Delivery</option>
          <option value="mesa">Para mesa</option>
        </select>
        <label class="form-label small mt-2">Notas adicionales (opcional)</label>
        <input id="waNotas" class="form-control" placeholder="Dirección, hora aproximada…">
      </div>
    `,
    customClass: { popup: 'wa-order-popup' },
    confirmButtonText: 'Abrir WhatsApp',
    confirmButtonColor: '#25D366',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    focusConfirm: false,
    preConfirm: () => ({
      nombre: document.getElementById('waName').value.trim(),
      tipo:   document.getElementById('waTipo').value,
      notas:  document.getElementById('waNotas').value.trim()
    })
  }).then(r => {
    if (!r.isConfirmed) return;
    const { nombre, tipo, notas } = r.value;

    const lineas = items.map(it => {
      let linea = `• ${it.qty}× ${it.nombre} — ${money(it.precio * it.qty)}`;
      if (it.obs) linea += `\n   _${it.obs}_`;
      return linea;
    }).join('\n');

    const partes = [];
    partes.push(`☕ *Pedido — ${UKU.appName}*`);
    if (nombre) partes.push(`👤 ${nombre}`);
    partes.push(`📦 Tipo: ${tipo}`);
    partes.push('');
    partes.push(lineas);
    partes.push('');
    partes.push(`Subtotal: ${money(base)}`);
    partes.push(`IGV (18%): ${money(igv)}`);
    partes.push(`*Total: ${money(total)}*`);
    if (notas) { partes.push(''); partes.push(`📝 ${notas}`); }
    partes.push('');
    partes.push('¡Gracias! 🤎');

    const msg = encodeURIComponent(partes.join('\n'));
    const url = `https://wa.me/${UKU.waNumber}?text=${msg}`;
    window.open(url, '_blank', 'noopener');
  });
}

document.addEventListener('DOMContentLoaded', renderCart);
document.addEventListener('cart:changed', renderCart);
</script>

<?php require __DIR__ . '/includes/footer.php'; ?>
