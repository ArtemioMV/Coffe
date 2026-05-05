<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['cocina','administrador']);

$pendientes = get_pedidos(['estados_in'=>[1,2]]);
$listos = get_pedidos(['estados_in'=>[3]]);

$panel_role='cocina'; $panel_active='dashboard';
$page_title='Panel cocina / barra'; $title='Cocina · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3 mb-4">
  <div class="col-md-4"><div class="kpi"><div class="ico"><i class="bi bi-hourglass-split"></i></div>
    <div class="lbl">Pendientes / preparación</div><div class="val"><?= count($pendientes) ?></div></div></div>
  <div class="col-md-4"><div class="kpi"><div class="ico"><i class="bi bi-check2-circle"></i></div>
    <div class="lbl">Listos para entregar</div><div class="val"><?= count($listos) ?></div></div></div>
</div>

<div class="d-flex gap-2 mb-3">
  <a class="btn btn-uku" href="/cocina/pedidos-pendientes.php"><i class="bi bi-fire"></i> Ver pendientes</a>
  <a class="btn btn-outline-uku" href="/cocina/pedidos-listos.php"><i class="bi bi-check2-all"></i> Ver listos</a>
</div>

<div class="panel-card">
  <h5 class="mb-3">Pedidos en cola</h5>
  <table class="table align-middle">
    <thead><tr><th>#</th><th>Origen</th><th>Mesa</th><th>Estado</th><th>Hora</th><th></th></tr></thead>
    <tbody>
      <?php foreach (array_merge($pendientes,$listos) as $p): ?>
        <tr>
          <td>#<?= $p['id'] ?></td>
          <td><?= e($p['cliente_nombre'] ?? $p['mesero_nombre'] ?? '—') ?></td>
          <td><?= e($p['mesa_numero'] ?? '—') ?></td>
          <td><?= badge_estado($p['estado']) ?></td>
          <td><?= e(date('H:i', strtotime($p['creado_en']))) ?></td>
          <td class="text-end">
            <a class="btn btn-sm btn-outline-uku" href="/cocina/pedidos-pendientes.php#p<?= $p['id'] ?>"><i class="bi bi-eye"></i></a>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
