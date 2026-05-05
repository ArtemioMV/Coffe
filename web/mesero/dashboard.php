<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['mesero','administrador']);

$user = current_user();
$mios = get_pedidos(['mesero_id'=>$user['id'], 'hoy'=>true]);
$activos = array_filter($mios, fn($p)=>in_array($p['estado'], ['pendiente','en preparación','listo']));

$panel_role='mesero'; $panel_active='dashboard';
$page_title='Panel del mesero'; $title='Mesero · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3 mb-4">
  <div class="col-md-3"><div class="kpi"><div class="ico"><i class="bi bi-receipt"></i></div>
    <div class="lbl">Mis pedidos hoy</div><div class="val"><?= count($mios) ?></div></div></div>
  <div class="col-md-3"><div class="kpi"><div class="ico"><i class="bi bi-hourglass-split"></i></div>
    <div class="lbl">Activos</div><div class="val"><?= count($activos) ?></div></div></div>
</div>

<div class="d-flex gap-2 mb-3">
  <a class="btn btn-uku" href="/mesero/nuevo-pedido.php"><i class="bi bi-plus-circle"></i> Nuevo pedido</a>
  <a class="btn btn-outline-uku" href="/mesero/mesas.php"><i class="bi bi-grid-3x3-gap"></i> Ver mesas</a>
</div>

<div class="panel-card">
  <h5 class="mb-3">Pedidos activos</h5>
  <table class="table align-middle">
    <thead><tr><th>#</th><th>Mesa</th><th>Total</th><th>Estado</th><th>Hora</th><th></th></tr></thead>
    <tbody>
      <?php foreach ($activos as $p): ?>
        <tr>
          <td>#<?= $p['id'] ?></td>
          <td><?= e($p['mesa_numero'] ?? '—') ?></td>
          <td><?= money($p['total']) ?></td>
          <td><?= badge_estado($p['estado']) ?></td>
          <td><?= e(date('H:i', strtotime($p['creado_en']))) ?></td>
          <td class="text-end">
            <?php if ($p['estado'] === 'listo'): ?>
              <button class="btn btn-sm btn-success" onclick="cambiarEstado(<?= $p['id'] ?>,4,'entregado')">
                <i class="bi bi-check2-circle"></i> Entregar
              </button>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$activos): ?>
        <tr><td colspan="6" class="text-center text-muted py-4">No hay pedidos activos.</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
