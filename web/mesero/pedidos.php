<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['mesero','administrador']);

$user = current_user();
$mios = get_pedidos(['mesero_id'=>$user['id']]);

$panel_role='mesero'; $panel_active='pedidos';
$page_title='Mis pedidos'; $title='Mis pedidos · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="panel-card">
  <h5 class="mb-3">Historial de mis pedidos</h5>
  <table class="table align-middle">
    <thead><tr><th>#</th><th>Fecha</th><th>Mesa</th><th>Total</th><th>Estado</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($mios as $p): ?>
      <tr>
        <td>#<?= $p['id'] ?></td>
        <td class="small"><?= e($p['creado_en']) ?></td>
        <td><?= e($p['mesa_numero'] ?? '—') ?></td>
        <td><?= money($p['total']) ?></td>
        <td><?= badge_estado($p['estado']) ?></td>
        <td class="text-end">
          <?php if ($p['estado'] === 'listo'): ?>
            <button class="btn btn-sm btn-success" onclick="cambiarEstado(<?= $p['id'] ?>,4,'entregado')">
              <i class="bi bi-check2-circle"></i> Entregar
            </button>
          <?php endif; ?>
        </td>
      </tr>
    <?php endforeach; ?>
    <?php if (!$mios): ?><tr><td colspan="6" class="text-center text-muted py-4">Sin pedidos.</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
