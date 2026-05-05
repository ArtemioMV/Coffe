<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$pdo = db();
$totalPedidos = (int)$pdo->query("SELECT COUNT(*) FROM pedidos")->fetchColumn();
$ventasHoy = (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE DATE(creado_en)=CURDATE() AND estado_id <> 5")->fetchColumn();
$pendientes = (int)$pdo->query("SELECT COUNT(*) FROM pedidos WHERE estado_id IN (1,2)")->fetchColumn();
$productosActivos = (int)$pdo->query("SELECT COUNT(*) FROM productos WHERE activo=1")->fetchColumn();

$pedidosRec = get_pedidos(['hoy'=>true]);

$panel_role = 'admin'; $panel_active = 'dashboard';
$page_title = 'Dashboard'; $title = 'Admin · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3 mb-4">
  <div class="col-sm-6 col-lg-3">
    <div class="kpi"><div class="ico"><i class="bi bi-receipt"></i></div>
      <div class="lbl">Total pedidos</div>
      <div class="val"><?= $totalPedidos ?></div>
    </div>
  </div>
  <div class="col-sm-6 col-lg-3">
    <div class="kpi"><div class="ico"><i class="bi bi-cash-coin"></i></div>
      <div class="lbl">Ventas hoy</div>
      <div class="val"><?= money($ventasHoy) ?></div>
    </div>
  </div>
  <div class="col-sm-6 col-lg-3">
    <div class="kpi"><div class="ico"><i class="bi bi-hourglass-split"></i></div>
      <div class="lbl">Pendientes</div>
      <div class="val"><?= $pendientes ?></div>
    </div>
  </div>
  <div class="col-sm-6 col-lg-3">
    <div class="kpi"><div class="ico"><i class="bi bi-cup-hot"></i></div>
      <div class="lbl">Productos activos</div>
      <div class="val"><?= $productosActivos ?></div>
    </div>
  </div>
</div>

<div class="panel-card">
  <h5 class="mb-3">Pedidos de hoy</h5>
  <div class="table-responsive">
    <table class="table align-middle">
      <thead><tr><th>#</th><th>Cliente</th><th>Mesero</th><th>Mesa</th><th>Tipo</th><th>Total</th><th>Estado</th><th>Hora</th></tr></thead>
      <tbody>
      <?php foreach ($pedidosRec as $p): ?>
        <tr>
          <td>#<?= $p['id'] ?></td>
          <td><?= e($p['cliente_nombre'] ?? '—') ?></td>
          <td><?= e($p['mesero_nombre'] ?? '—') ?></td>
          <td><?= e($p['mesa_numero'] ?? '—') ?></td>
          <td><?= e($p['tipo_pedido']) ?></td>
          <td><?= money($p['total']) ?></td>
          <td><?= badge_estado($p['estado']) ?></td>
          <td><?= e(date('H:i', strtotime($p['creado_en']))) ?></td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$pedidosRec): ?>
        <tr><td colspan="8" class="text-center text-muted py-4">Sin pedidos hoy.</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
