<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$pdo = db();

$ventasHoy = (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE DATE(creado_en)=CURDATE() AND estado_id<>5")->fetchColumn();
$ventasMes = (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE YEAR(creado_en)=YEAR(CURDATE()) AND MONTH(creado_en)=MONTH(CURDATE()) AND estado_id<>5")->fetchColumn();
$ticket = (float)$pdo->query("SELECT COALESCE(AVG(total),0) FROM pedidos WHERE estado_id<>5")->fetchColumn();

$porEstado = $pdo->query("
  SELECT e.nombre AS estado, COUNT(*) AS total
  FROM pedidos p INNER JOIN estados_pedido e ON e.id=p.estado_id
  GROUP BY e.id, e.nombre ORDER BY e.id
")->fetchAll();

$topProductos = $pdo->query("
  SELECT p.nombre, SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS importe
  FROM detalle_pedido d
  INNER JOIN productos p ON p.id = d.producto_id
  INNER JOIN pedidos pe ON pe.id = d.pedido_id
  WHERE pe.estado_id <> 5
  GROUP BY p.id, p.nombre
  ORDER BY unidades DESC
  LIMIT 10
")->fetchAll();

$ventasUltimos7 = $pdo->query("
  SELECT DATE(creado_en) AS dia, COALESCE(SUM(total),0) AS total
  FROM pedidos WHERE estado_id<>5 AND creado_en >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  GROUP BY DATE(creado_en) ORDER BY dia
")->fetchAll();

$panel_role='admin'; $panel_active='reportes';
$page_title='Reportes'; $title='Reportes · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3 mb-4">
  <div class="col-md-4"><div class="kpi"><div class="ico"><i class="bi bi-cash-coin"></i></div>
    <div class="lbl">Ventas hoy</div><div class="val"><?= money($ventasHoy) ?></div></div></div>
  <div class="col-md-4"><div class="kpi"><div class="ico"><i class="bi bi-calendar3"></i></div>
    <div class="lbl">Ventas mes</div><div class="val"><?= money($ventasMes) ?></div></div></div>
  <div class="col-md-4"><div class="kpi"><div class="ico"><i class="bi bi-graph-up"></i></div>
    <div class="lbl">Ticket promedio</div><div class="val"><?= money($ticket) ?></div></div></div>
</div>

<div class="row g-3">
  <div class="col-lg-6">
    <div class="panel-card">
      <h5 class="mb-3">Pedidos por estado</h5>
      <table class="table">
        <thead><tr><th>Estado</th><th class="text-end">Total</th></tr></thead>
        <tbody>
          <?php foreach ($porEstado as $r): ?>
            <tr><td><?= badge_estado($r['estado']) ?></td><td class="text-end"><?= $r['total'] ?></td></tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
  <div class="col-lg-6">
    <div class="panel-card">
      <h5 class="mb-3">Ventas últimos 7 días</h5>
      <table class="table">
        <thead><tr><th>Día</th><th class="text-end">Total</th></tr></thead>
        <tbody>
          <?php foreach ($ventasUltimos7 as $r): ?>
            <tr><td><?= e($r['dia']) ?></td><td class="text-end"><?= money($r['total']) ?></td></tr>
          <?php endforeach; ?>
          <?php if (!$ventasUltimos7): ?>
            <tr><td colspan="2" class="text-center text-muted">Sin datos.</td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<div class="panel-card">
  <h5 class="mb-3">Top productos</h5>
  <table class="table">
    <thead><tr><th>#</th><th>Producto</th><th class="text-end">Unidades</th><th class="text-end">Importe</th></tr></thead>
    <tbody>
      <?php foreach ($topProductos as $i => $r): ?>
        <tr><td><?= $i+1 ?></td><td><?= e($r['nombre']) ?></td>
            <td class="text-end"><?= $r['unidades'] ?></td>
            <td class="text-end"><?= money($r['importe']) ?></td></tr>
      <?php endforeach; ?>
      <?php if (!$topProductos): ?>
        <tr><td colspan="4" class="text-center text-muted">Sin datos.</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
