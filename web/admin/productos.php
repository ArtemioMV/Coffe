<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role('administrador');

$pdo = db();
$msg = null; $err = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_check($_POST['_csrf'] ?? null)) {
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'crear') {
            $stmt = $pdo->prepare("INSERT INTO productos (categoria_id, nombre, descripcion, precio, activo) VALUES (?,?,?,?,1)");
            $stmt->execute([
                (int)$_POST['categoria_id'], trim($_POST['nombre']),
                trim($_POST['descripcion']) ?: null, (float)$_POST['precio']
            ]);
            $msg = 'Producto creado.';
        } elseif ($action === 'editar') {
            $stmt = $pdo->prepare("UPDATE productos SET categoria_id=?, nombre=?, descripcion=?, precio=? WHERE id=?");
            $stmt->execute([
                (int)$_POST['categoria_id'], trim($_POST['nombre']),
                trim($_POST['descripcion']) ?: null, (float)$_POST['precio'],
                (int)$_POST['id']
            ]);
            $msg = 'Producto actualizado.';
        } elseif ($action === 'toggle') {
            $stmt = $pdo->prepare("UPDATE productos SET activo = 1 - activo WHERE id=?");
            $stmt->execute([(int)$_POST['id']]);
            $msg = 'Estado de producto actualizado.';
        }
    } catch (Throwable $e) { $err = $e->getMessage(); }
}

$cats = get_categorias(false);
$prods = $pdo->query("SELECT p.*, c.nombre AS categoria FROM productos p
                      LEFT JOIN categorias c ON c.id = p.categoria_id
                      ORDER BY c.orden, p.nombre")->fetchAll();

$panel_role='admin'; $panel_active='productos';
$page_title='Gestión de productos'; $title='Productos · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<?php if ($msg): ?><div class="alert alert-success"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endif; ?>

<div class="panel-card">
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h5 class="mb-0">Productos</h5>
    <button class="btn btn-uku" data-bs-toggle="modal" data-bs-target="#prodModal" onclick="abrirModal()">
      <i class="bi bi-plus-lg"></i> Nuevo producto
    </button>
  </div>

  <div class="table-responsive">
    <table class="table align-middle">
      <thead><tr><th>#</th><th>Categoría</th><th>Nombre</th><th>Descripción</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($prods as $p): ?>
        <tr>
          <td><?= $p['id'] ?></td>
          <td><?= e($p['categoria']) ?></td>
          <td><?= e($p['nombre']) ?></td>
          <td class="small text-muted" style="max-width:300px"><?= e($p['descripcion']) ?></td>
          <td><?= money($p['precio']) ?></td>
          <td><?= $p['activo'] ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>' ?></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#prodModal"
                    onclick='abrirModal(<?= json_encode($p) ?>)'><i class="bi bi-pencil"></i></button>
            <form method="post" class="d-inline" onsubmit="return confirm('¿Cambiar estado?')">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="toggle">
              <input type="hidden" name="id" value="<?= $p['id'] ?>">
              <button class="btn btn-sm btn-outline-<?= $p['activo']?'danger':'success' ?>">
                <i class="bi bi-<?= $p['activo']?'eye-slash':'eye' ?>"></i>
              </button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Modal -->
<div class="modal fade" id="prodModal" tabindex="-1">
  <div class="modal-dialog">
    <form class="modal-content" method="post" id="prodForm">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="crear" id="prodAction">
      <input type="hidden" name="id" value="" id="prodId">
      <div class="modal-header">
        <h5 class="modal-title" id="prodTitle">Nuevo producto</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Categoría</label>
          <select class="form-select" name="categoria_id" id="prodCat" required>
            <?php foreach ($cats as $c): ?>
              <option value="<?= $c['id'] ?>"><?= e($c['nombre']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Nombre</label>
          <input type="text" class="form-control" name="nombre" id="prodNombre" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" name="descripcion" id="prodDesc" rows="2"></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">Precio (S/)</label>
          <input type="number" step="0.10" class="form-control" name="precio" id="prodPrecio" required>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-link" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-uku">Guardar</button>
      </div>
    </form>
  </div>
</div>

<script>
function abrirModal(p) {
  if (p) {
    document.getElementById('prodTitle').textContent = 'Editar producto';
    document.getElementById('prodAction').value = 'editar';
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodCat').value = p.categoria_id;
    document.getElementById('prodNombre').value = p.nombre;
    document.getElementById('prodDesc').value = p.descripcion || '';
    document.getElementById('prodPrecio').value = p.precio;
  } else {
    document.getElementById('prodTitle').textContent = 'Nuevo producto';
    document.getElementById('prodAction').value = 'crear';
    document.getElementById('prodForm').reset();
  }
}
</script>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
