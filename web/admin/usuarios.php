<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$pdo = db();
$msg = null; $err = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_check($_POST['_csrf'] ?? null)) {
    $a = $_POST['action'] ?? '';
    try {
        if ($a === 'crear') {
            $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO usuarios (rol_id, nombre, correo, telefono, password, activo) VALUES (?,?,?,?,?,1)")
                ->execute([(int)$_POST['rol_id'], trim($_POST['nombre']), trim($_POST['correo']),
                           trim($_POST['telefono']) ?: null, $hash]);
            $msg = 'Usuario creado.';
        } elseif ($a === 'rol') {
            $pdo->prepare("UPDATE usuarios SET rol_id=? WHERE id=?")
                ->execute([(int)$_POST['rol_id'], (int)$_POST['id']]);
            $msg = 'Rol actualizado.';
        } elseif ($a === 'toggle') {
            $pdo->prepare("UPDATE usuarios SET activo = 1 - activo WHERE id=?")
                ->execute([(int)$_POST['id']]);
            $msg = 'Estado actualizado.';
        } elseif ($a === 'reset_pass') {
            $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $pdo->prepare("UPDATE usuarios SET password=? WHERE id=?")
                ->execute([$hash, (int)$_POST['id']]);
            $msg = 'Contraseña restablecida.';
        }
    } catch (Throwable $e) { $err = $e->getMessage(); }
}

$roles = $pdo->query("SELECT * FROM roles ORDER BY id")->fetchAll();
$users = $pdo->query("SELECT u.*, r.nombre AS rol FROM usuarios u INNER JOIN roles r ON r.id=u.rol_id ORDER BY u.id DESC")->fetchAll();

$panel_role='admin'; $panel_active='usuarios';
$page_title='Usuarios'; $title='Usuarios · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<?php if ($msg): ?><div class="alert alert-success"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endif; ?>

<div class="row g-3">
  <div class="col-lg-4">
    <div class="panel-card">
      <h5>Nuevo usuario</h5>
      <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="crear">
        <div class="mb-2"><label class="form-label small">Rol</label>
          <select class="form-select" name="rol_id" required>
            <?php foreach ($roles as $r): ?>
              <option value="<?= $r['id'] ?>"><?= e($r['nombre']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="mb-2"><label class="form-label small">Nombre</label>
          <input type="text" class="form-control" name="nombre" required></div>
        <div class="mb-2"><label class="form-label small">Correo</label>
          <input type="email" class="form-control" name="correo" required></div>
        <div class="mb-2"><label class="form-label small">Teléfono</label>
          <input type="tel" class="form-control" name="telefono"></div>
        <div class="mb-3"><label class="form-label small">Contraseña</label>
          <input type="text" class="form-control" name="password" required minlength="6"></div>
        <button class="btn btn-uku w-100"><i class="bi bi-person-plus"></i> Crear</button>
      </form>
    </div>
  </div>

  <div class="col-lg-8">
    <div class="panel-card">
      <h5 class="mb-3">Usuarios registrados</h5>
      <div class="table-responsive">
        <table class="table align-middle">
          <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
          <?php foreach ($users as $u): ?>
            <tr>
              <td><?= $u['id'] ?></td>
              <td><?= e($u['nombre']) ?></td>
              <td class="small"><?= e($u['correo']) ?></td>
              <td>
                <form method="post" class="d-flex gap-1">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="rol">
                  <input type="hidden" name="id" value="<?= $u['id'] ?>">
                  <select class="form-select form-select-sm" name="rol_id" onchange="this.form.submit()">
                    <?php foreach ($roles as $r): ?>
                      <option value="<?= $r['id'] ?>" <?= $r['nombre']===$u['rol']?'selected':'' ?>><?= e($r['nombre']) ?></option>
                    <?php endforeach; ?>
                  </select>
                </form>
              </td>
              <td><?= $u['activo'] ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>' ?></td>
              <td class="text-end">
                <form method="post" class="d-inline">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="toggle">
                  <input type="hidden" name="id" value="<?= $u['id'] ?>">
                  <button class="btn btn-sm btn-outline-<?= $u['activo']?'danger':'success' ?>" title="Cambiar estado">
                    <i class="bi bi-<?= $u['activo']?'eye-slash':'eye' ?>"></i>
                  </button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
