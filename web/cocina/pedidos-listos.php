<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['cocina','administrador']);

$pedidos = get_pedidos(['estados_in'=>[3]]);

$panel_role='cocina'; $panel_active='listos';
$page_title='Pedidos listos'; $title='Listos · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="panel-card">
  <h5 class="mb-3">Listos para entregar</h5>
  <?php if (!$pedidos): ?>
    <p class="text-center text-muted py-4">No hay pedidos listos.</p>
  <?php endif; ?>
  <div class="row g-3">
    <?php foreach ($pedidos as $p): $det = get_pedido_detalle((int)$p['id']); ?>
      <div class="col-md-6">
        <div class="border rounded p-3">
          <div class="d-flex justify-content-between mb-1">
            <strong>#<?= $p['id'] ?></strong>
            <small class="text-muted"><?= e(date('H:i', strtotime($p['creado_en']))) ?></small>
          </div>
          <div class="small text-muted">
            <?php if ($p['mesa_numero']): ?>Mesa <?= e($p['mesa_numero']) ?> · <?php endif; ?>
            <?= e($p['cliente_nombre'] ?? $p['mesero_nombre'] ?? '—') ?>
          </div>
          <ul class="small mt-2 mb-0">
            <?php foreach ($det as $d): ?>
              <li><?= $d['cantidad'] ?>× <?= e($d['producto']) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
