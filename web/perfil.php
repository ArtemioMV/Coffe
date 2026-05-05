<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/helpers.php';
require_login();

$user = current_user();
$msg = null; $err = null;

// Recargar puntos actuales
$stmt = db()->prepare("SELECT puntos FROM usuarios WHERE id=?");
$stmt->execute([$user['id']]);
$puntos = (int)$stmt->fetchColumn();

// Canjear
if ($_SERVER['REQUEST_METHOD']==='POST' && csrf_check($_POST['_csrf'] ?? null) && ($_POST['action'] ?? '')==='canjear') {
    $bloques = max(1, (int)($_POST['bloques'] ?? 1));
    $puntosACanjear = $bloques * PUNTOS_CANJE_BLOQUE;
    $r = canjear_puntos((int)$user['id'], $puntosACanjear);
    if ($r['ok']) { $msg = "¡Canje realizado! Tienes un cupón virtual de S/ {$r['descuento']}."; }
    else { $err = $r['msg']; }
    // refrescar
    $stmt = db()->prepare("SELECT puntos FROM usuarios WHERE id=?");
    $stmt->execute([$user['id']]);
    $puntos = (int)$stmt->fetchColumn();
}

$pedidos = get_pedidos(['usuario_id'=>$user['id']]);
$movs = get_puntos_movimientos((int)$user['id']);

$page = 'perfil';
$title = 'Mi cuenta · UKUMARI';
require __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="container">
    <div class="section-title">
      <span class="script">Bienvenido</span>
      <h2>Mi cuenta</h2>
    </div>

    <?php if ($msg): ?><div class="alert alert-success"><?= e($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endif; ?>

    <div class="row g-4">
      <!-- Tarjeta puntos -->
      <div class="col-lg-4">
        <div class="summary-card" style="position:static">
          <div class="text-center mb-3">
            <i class="bi bi-stars" style="font-size:2.6rem;color:var(--uku-gold)"></i>
            <h5 class="mt-2 mb-1" style="color:#fff">Mis puntos UKUMARI</h5>
            <div style="font-family:'Playfair Display';font-size:3rem;color:var(--uku-gold);line-height:1">
              <?= number_format($puntos) ?>
            </div>
            <small style="color:#f0d8b3">Acumula 1 punto por cada S/ 1 gastado.</small>
          </div>

          <hr style="border-color:rgba(255,255,255,.2)">

          <h6 style="color:#fff">Canjear puntos</h6>
          <p class="small" style="color:#f0d8b3">Cada <?= PUNTOS_CANJE_BLOQUE ?> puntos = <strong>S/ <?= number_format(SOLES_POR_BLOQUE_CANJE,2) ?></strong> de descuento.</p>
          <?php $maxBloques = intdiv($puntos, PUNTOS_CANJE_BLOQUE); ?>
          <?php if ($maxBloques < 1): ?>
            <p class="small fst-italic" style="color:#f0d8b3">Te faltan <?= PUNTOS_CANJE_BLOQUE - $puntos ?> puntos para tu primer canje.</p>
          <?php else: ?>
            <form method="post" class="d-flex gap-2">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="canjear">
              <select class="form-select form-select-sm" name="bloques">
                <?php for ($b=1; $b<=$maxBloques; $b++): ?>
                  <option value="<?= $b ?>"><?= $b * PUNTOS_CANJE_BLOQUE ?> pts → S/ <?= number_format($b * SOLES_POR_BLOQUE_CANJE,2) ?></option>
                <?php endfor; ?>
              </select>
              <button class="btn btn-gold btn-sm" type="submit"><i class="bi bi-gift"></i> Canjear</button>
            </form>
          <?php endif; ?>
        </div>
      </div>

      <div class="col-lg-8">
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tabPedidos">Mis pedidos</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tabPuntos">Movimientos de puntos</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tabDatos">Mis datos</a></li>
        </ul>

        <div class="tab-content border border-top-0 rounded-bottom p-3" style="background:#fff">
          <!-- Pedidos -->
          <div class="tab-pane fade show active" id="tabPedidos">
            <?php if (!$pedidos): ?>
              <p class="text-muted text-center py-4">Aún no tienes pedidos. <a href="/carta.php">Ver carta</a></p>
            <?php else: ?>
              <table class="table align-middle">
                <thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                <?php foreach ($pedidos as $p): ?>
                  <tr>
                    <td>#<?= $p['id'] ?></td>
                    <td class="small"><?= e($p['creado_en']) ?></td>
                    <td><?= e($p['tipo_pedido']) ?></td>
                    <td><?= money($p['total']) ?></td>
                    <td><?= badge_estado($p['estado']) ?></td>
                  </tr>
                <?php endforeach; ?>
                </tbody>
              </table>
            <?php endif; ?>
          </div>

          <!-- Puntos -->
          <div class="tab-pane fade" id="tabPuntos">
            <?php if (!$movs): ?>
              <p class="text-muted text-center py-4">Aún no tienes movimientos de puntos.</p>
            <?php else: ?>
              <table class="table align-middle">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Descripción</th></tr></thead>
                <tbody>
                  <?php foreach ($movs as $m): ?>
                    <tr>
                      <td class="small"><?= e($m['creado_en']) ?></td>
                      <td>
                        <?php if ($m['tipo']==='ganados'): ?>
                          <span class="badge bg-success">+ Ganados</span>
                        <?php else: ?>
                          <span class="badge bg-warning text-dark">− Canjeados</span>
                        <?php endif; ?>
                      </td>
                      <td><strong><?= ($m['tipo']==='ganados'?'+':'−') . $m['puntos'] ?></strong></td>
                      <td class="small text-muted"><?= e($m['descripcion']) ?></td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            <?php endif; ?>
          </div>

          <!-- Datos -->
          <div class="tab-pane fade" id="tabDatos">
            <dl class="row mb-0">
              <dt class="col-sm-3">Nombre</dt><dd class="col-sm-9"><?= e($user['nombre']) ?></dd>
              <dt class="col-sm-3">Correo</dt><dd class="col-sm-9"><?= e($user['correo']) ?></dd>
              <dt class="col-sm-3">Rol</dt><dd class="col-sm-9"><?= e($user['rol']) ?></dd>
            </dl>
            <a href="/recuperar.php" class="btn btn-outline-uku btn-sm mt-3"><i class="bi bi-key"></i> Cambiar contraseña</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
