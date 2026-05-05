<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$pdo = db();
$msg = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_check($_POST['_csrf'] ?? null)) {
    $action = $_POST['action'] ?? '';
    if ($action === 'crear') {
        $pdo->prepare("INSERT INTO categorias (nombre, orden, activo) VALUES (?,?,1)")
            ->execute([trim($_POST['nombre']), (int)($_POST['orden'] ?? 0)]);
        $msg = 'Categoría creada.';
    } elseif ($action === 'editar') {
        $pdo->prepare("UPDATE categorias SET nombre=?, orden=? WHERE id=?")
            ->execute([trim($_POST['nombre']), (int)$_POST['orden'], (int)$_POST['id']]);
        $msg = 'Categoría actualizada.';
    } elseif ($action === 'toggle') {
        $pdo->prepare("UPDATE categorias SET activo = 1 - activo WHERE id=?")
            ->execute([(int)$_POST['id']]);
        $msg = 'Estado actualizado.';
    }
}

$cats = $pdo->query("SELECT * FROM categorias ORDER BY orden, nombre")->fetchAll();

$panel_role='admin'; $panel_active='categorias';
$page_title='Categorías'; $title='Categorías · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<?php if ($msg): ?><div class="alert alert-success"><?= e($msg) ?></div><?php endif; ?>

<div class="row g-3">
  <div class="col-lg-4">
    <div class="panel-card">
      <h5>Nueva categoría</h5>
      <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="crear">
        <div class="mb-3">
          <label class="form-label">Nombre</label>
          <input type="text" class="form-control" name="nombre" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Orden</label>
          <input type="number" class="form-control" name="orden" value="0">
        </div>
        <button class="btn btn-uku w-100"><i class="bi bi-plus-lg"></i> Crear</button>
      </form>
    </div>
  </div>

  <div class="col-lg-8">
    <div class="panel-card">
      <h5 class="mb-3">Categorías</h5>
      <table class="table align-middle">
        <thead><tr><th>#</th><th>Nombre</th><th>Orden</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          <?php foreach ($cats as $c): ?>
            <tr>
              <form method="post">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="editar">
                <input type="hidden" name="id" value="<?= $c['id'] ?>">
                <td><?= $c['id'] ?></td>
                <td><input class="form-control form-control-sm" name="nombre" value="<?= e($c['nombre']) ?>"></td>
                <td style="width:90px"><input type="number" class="form-control form-control-sm" name="orden" value="<?= $c['orden'] ?>"></td>
                <td><?= $c['activo'] ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>' ?></td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-uku"><i class="bi bi-save"></i></button>
                </td>
              </form>
              <td>
                <form method="post" class="d-inline">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="toggle">
                  <input type="hidden" name="id" value="<?= $c['id'] ?>">
                  <button class="btn btn-sm btn-outline-<?= $c['activo']?'danger':'success' ?>">
                    <i class="bi bi-<?= $c['activo']?'eye-slash':'eye' ?>"></i>
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

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
