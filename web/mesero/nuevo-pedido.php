<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['mesero','administrador']);

$grouped = get_productos_por_categoria(true);
$mesas = db()->query("SELECT * FROM mesas ORDER BY CAST(numero AS UNSIGNED)")->fetchAll();
$clientes = db()->query("
  SELECT u.id, SUBSTRING_INDEX(TRIM(u.nombre), ' ', 2) AS nombre, '' AS correo, '' AS telefono
  FROM usuarios u
  INNER JOIN roles r ON r.id = u.rol_id
  WHERE r.nombre = 'cliente' AND u.activo = 1
  ORDER BY u.nombre
")->fetchAll();

$panel_role='mesero'; $panel_active='nuevo';
$page_title='Nuevo pedido'; $title='Nuevo pedido · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3">
  <div class="col-lg-8">
    <div class="panel-card">
      <h5 class="mb-3">Carta</h5>
      <input type="text" class="form-control mb-3" id="searchProd" placeholder="Buscar producto…">
      <div style="max-height:60vh;overflow-y:auto" id="prodList">
      <?php foreach ($grouped as $cat => $items): ?>
        <h6 class="text-uku mt-3"><?= e($cat) ?></h6>
        <div class="row gx-2">
        <?php foreach ($items as $p): ?>
          <div class="col-md-6 prod-item" data-name="<?= e(strtolower($p['nombre'])) ?>">
            <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-1">
              <div>
                <div class="fw-semibold small"><?= e($p['nombre']) ?></div>
                <div class="small text-muted"><?= money($p['precio']) ?></div>
              </div>
              <button class="btn btn-sm btn-uku"
                      onclick="addItem(<?= (int)$p['id'] ?>, '<?= e(addslashes($p['nombre'])) ?>', <?= (float)$p['precio'] ?>)">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        <?php endforeach; ?>
        </div>
      <?php endforeach; ?>
      </div>
    </div>
  </div>

  <div class="col-lg-4">
    <div class="panel-card" style="position:sticky;top:20px">
      <h5 class="mb-3">Pedido en curso</h5>
      <div class="mb-2">
        <label class="form-label small">Mesa</label>
        <select class="form-select" id="mesa_id" required>
          <?php foreach ($mesas as $m): ?>
            <option value="<?= $m['id'] ?>" <?= $m['estado']==='ocupada'?'disabled':'' ?>>
              Mesa <?= e($m['numero']) ?> <?= $m['estado']==='ocupada'?'(ocupada)':'' ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="mb-2">
        <label class="form-label small">Cliente</label>
        <select class="form-select" id="usuario_id">
          <option value="">Público general</option>
          <?php foreach ($clientes as $c): ?>
            <option value="<?= (int)$c['id'] ?>">
              <?= e($c['nombre']) ?><?= $c['telefono'] ? ' · ' . e($c['telefono']) : '' ?><?= $c['correo'] ? ' · ' . e($c['correo']) : '' ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="mb-2">
        <label class="form-label small">Observaciones</label>
        <textarea class="form-control" id="observaciones" rows="2"></textarea>
      </div>
      <hr>
      <div id="cartList"><div class="text-muted small text-center py-3">Aún no agregas productos.</div></div>
      <div class="d-flex justify-content-between mt-3 pt-2 border-top">
        <strong>Total</strong><strong id="totalLbl">S/ 0.00</strong>
      </div>
      <button class="btn btn-uku w-100 mt-3" id="enviarBtn" disabled>
        <i class="bi bi-send-check"></i> Enviar a cocina
      </button>
    </div>
  </div>
</div>

<script>
const items = new Map();
const csrf = '<?= e(csrf_token()) ?>';

function money(n){ return 'S/ ' + Number(n).toFixed(2); }

function addItem(id, nombre, precio) {
  if (items.has(id)) items.get(id).qty++;
  else items.set(id, { id, nombre, precio, qty: 1 });
  render();
}
function setQty(id, q) {
  if (q <= 0) items.delete(id);
  else items.get(id).qty = q;
  render();
}
function render() {
  const list = document.getElementById('cartList');
  if (!items.size) {
    list.innerHTML = '<div class="text-muted small text-center py-3">Aún no agregas productos.</div>';
    document.getElementById('totalLbl').textContent = 'S/ 0.00';
    document.getElementById('enviarBtn').disabled = true;
    return;
  }
  let total = 0;
  list.innerHTML = '';
  for (const it of items.values()) {
    total += it.precio * it.qty;
    const row = document.createElement('div');
    row.className = 'mesero-cart-row d-flex justify-content-between align-items-center py-2 border-bottom';
    row.innerHTML = `
      <div class="small flex-grow-1">
        <div class="fw-semibold">${it.nombre}</div>
        <div class="text-muted">${money(it.precio)}</div>
      </div>
      <div class="qty-ctrl">
        <button onclick="setQty(${it.id}, ${it.qty - 1})">−</button>
        <span>${it.qty}</span>
        <button onclick="setQty(${it.id}, ${it.qty + 1})">+</button>
      </div>
    `;
    list.appendChild(row);
  }
  document.getElementById('totalLbl').textContent = money(total);
  document.getElementById('enviarBtn').disabled = false;
}

document.getElementById('searchProd').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.prod-item').forEach(el => {
    el.style.display = (!q || el.dataset.name.includes(q)) ? '' : 'none';
  });
});

document.getElementById('enviarBtn').addEventListener('click', async () => {
  const mesa_id = document.getElementById('mesa_id').value;
  const usuario_id = document.getElementById('usuario_id').value;
  if (!mesa_id) { Swal.fire('Falta mesa','Selecciona una mesa','warning'); return; }
  const payload = {
    _csrf: csrf,
    mesa_id: parseInt(mesa_id, 10),
    usuario_id: usuario_id ? parseInt(usuario_id, 10) : null,
    tipo_pedido: 'mesa',
    observaciones: document.getElementById('observaciones').value || null,
    items: [...items.values()].map(i=>({ producto_id:i.id, cantidad:i.qty }))
  };
  Swal.fire({ title:'Enviando…', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
  const r = await fetch('/api/pedido_crear.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const j = await r.json();
  if (j.ok) {
    Swal.fire({ icon:'success', title:'Pedido enviado', text:`#${j.pedido_id} · ${money(j.total)}`, confirmButtonColor:'#a47a44' })
        .then(()=>location.href='/mesero/dashboard.php');
  } else {
    Swal.fire('Error', j.msg || 'No se pudo enviar', 'error');
  }
});
</script>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
