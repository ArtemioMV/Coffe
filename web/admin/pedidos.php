<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$estado = isset($_GET['estado']) ? (int)$_GET['estado'] : 0;
$filtros = $estado ? ['estado_id'=>$estado] : [];
$pedidos = get_pedidos($filtros);

$estados = db()->query("SELECT * FROM estados_pedido ORDER BY id")->fetchAll();

$panel_role='admin'; $panel_active='pedidos';
$page_title='Pedidos'; $title='Pedidos · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="panel-card">
  <div class="d-flex flex-wrap gap-2 mb-3">
    <a class="btn btn-sm <?= !$estado?'btn-uku':'btn-outline-uku' ?>" href="?">Todos</a>
    <?php foreach ($estados as $es): ?>
      <a class="btn btn-sm <?= $estado==$es['id']?'btn-uku':'btn-outline-uku' ?>" href="?estado=<?= $es['id'] ?>">
        <?= e(ucfirst($es['nombre'])) ?>
      </a>
    <?php endforeach; ?>
  </div>

  <div class="table-responsive">
    <table class="table align-middle">
      <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Mesero</th><th>Mesa</th><th>Tipo</th><th>Total</th><th>Estado</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($pedidos as $p): ?>
        <tr>
          <td>#<?= $p['id'] ?></td>
          <td class="small"><?= e($p['creado_en']) ?></td>
          <td><?= e($p['cliente_nombre'] ?? '—') ?></td>
          <td><?= e($p['mesero_nombre'] ?? '—') ?></td>
          <td><?= e($p['mesa_numero'] ?? '—') ?></td>
          <td><?= e($p['tipo_pedido']) ?></td>
          <td><?= money($p['total']) ?></td>
          <td><?= badge_estado($p['estado']) ?></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-uku" data-bs-toggle="modal" data-bs-target="#detalle<?= $p['id'] ?>">
              <i class="bi bi-eye"></i> Ver
            </button>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$pedidos): ?>
        <tr><td colspan="9" class="text-center text-muted py-4">Sin pedidos.</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php foreach ($pedidos as $p): $det = get_pedido_detalle((int)$p['id']); ?>
<div class="modal fade" id="detalle<?= $p['id'] ?>" tabindex="-1">
  <div class="modal-dialog modal-lg"><div class="modal-content">
    <div class="modal-header">
      <h5 class="modal-title">Pedido #<?= $p['id'] ?> · <?= badge_estado($p['estado']) ?></h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="row small mb-2">
        <div class="col-md-6"><b>Cliente:</b> <?= e($p['cliente_nombre'] ?? '—') ?></div>
        <div class="col-md-6"><b>Mesero:</b> <?= e($p['mesero_nombre'] ?? '—') ?></div>
        <div class="col-md-6"><b>Tipo:</b> <?= e($p['tipo_pedido']) ?></div>
        <div class="col-md-6"><b>Mesa:</b> <?= e($p['mesa_numero'] ?? '—') ?></div>
        <div class="col-md-6"><b>Pago:</b> <?= e($p['metodo_pago'] ?? '—') ?></div>
        <div class="col-md-6"><b>Fecha:</b> <?= e($p['creado_en']) ?></div>
      </div>
      <?php if ($p['observaciones']): ?>
        <div class="alert alert-warning small"><b>Obs:</b> <?= e($p['observaciones']) ?></div>
      <?php endif; ?>
      <table class="table table-sm">
        <thead><tr><th>Producto</th><th>Cant</th><th>P.U.</th><th>Subt.</th></tr></thead>
        <tbody>
          <?php foreach ($det as $d): ?>
            <tr>
              <td><?= e($d['producto']) ?><?php if (!empty($d['observacion'])): ?><div class="small text-muted"><?= e($d['observacion']) ?></div><?php endif; ?></td>
              <td><?= $d['cantidad'] ?></td>
              <td><?= money($d['precio_unitario']) ?></td>
              <td><?= money($d['subtotal']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
        <tfoot>
          <tr><td colspan="3" class="text-end">Subtotal</td><td><?= money($p['subtotal']) ?></td></tr>
          <tr><td colspan="3" class="text-end">IGV</td><td><?= money($p['igv']) ?></td></tr>
          <tr><td colspan="3" class="text-end"><b>Total</b></td><td><b><?= money($p['total']) ?></b></td></tr>
        </tfoot>
      </table>
    </div>
  </div></div>
</div>
<?php endforeach; ?>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
