<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['cocina','administrador']);

$pedidos = get_pedidos(['estados_in'=>[1,2]]);

$panel_role='cocina'; $panel_active='pendientes';
$page_title='Pedidos pendientes'; $title='Pendientes · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<meta http-equiv="refresh" content="30"> <!-- auto-refresh 30s -->

<?php if (!$pedidos): ?>
  <div class="panel-card text-center py-5">
    <i class="bi bi-emoji-smile" style="font-size:3rem;color:var(--uku-gold-dark)"></i>
    <h4 class="mt-3">Sin pedidos pendientes</h4>
    <p class="text-muted">Todo está al día.</p>
  </div>
<?php endif; ?>

<div class="row g-3">
<?php foreach ($pedidos as $p): $det = get_pedido_detalle((int)$p['id']); ?>
  <div class="col-lg-6" id="p<?= $p['id'] ?>">
    <div class="panel-card h-100">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="mb-0">Pedido #<?= $p['id'] ?></h5>
          <small class="text-muted">
            <i class="bi bi-clock"></i> <?= e(date('H:i', strtotime($p['creado_en']))) ?> ·
            <?php if ($p['mesa_numero']): ?><i class="bi bi-grid-3x3-gap"></i> Mesa <?= e($p['mesa_numero']) ?><?php endif; ?>
            <?php if ($p['cliente_nombre']): ?>· <?= e($p['cliente_nombre']) ?><?php endif; ?>
          </small>
        </div>
        <?= badge_estado($p['estado']) ?>
      </div>

      <?php if ($p['observaciones']): ?>
        <div class="alert alert-warning small py-2"><b>Obs:</b> <?= e($p['observaciones']) ?></div>
      <?php endif; ?>

      <table class="table table-sm mb-2">
        <tbody>
          <?php foreach ($det as $d): ?>
            <tr>
              <td><strong><?= $d['cantidad'] ?>×</strong> <?= e($d['producto']) ?>
                <?php if (!empty($d['observacion'])): ?>
                  <div class="small text-muted">↳ <?= e($d['observacion']) ?></div>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>

      <div class="d-flex gap-2 mt-2">
        <?php if ($p['estado'] === 'pendiente'): ?>
          <button class="btn btn-info text-white flex-grow-1" onclick="cambiarEstado(<?= $p['id'] ?>,2,'en preparación')">
            <i class="bi bi-fire"></i> Empezar preparación
          </button>
        <?php elseif ($p['estado'] === 'en preparación'): ?>
          <button class="btn btn-primary flex-grow-1" onclick="cambiarEstado(<?= $p['id'] ?>,3,'listo')">
            <i class="bi bi-check2-circle"></i> Marcar listo
          </button>
        <?php endif; ?>
      </div>
    </div>
  </div>
<?php endforeach; ?>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
