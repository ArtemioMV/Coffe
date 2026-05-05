<?php
// Layout interno reutilizable. Se espera definidas:
//   $panel_role  ('admin'|'mesero'|'cocina')
//   $panel_active (slug de la opción activa)
//   $title (opcional)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';

$user = current_user();
$role = $panel_role ?? 'admin';
$active = $panel_active ?? '';

$menus = [
    'admin' => [
        ['dashboard','Dashboard','/admin/dashboard.php','speedometer2'],
        ['productos','Productos','/admin/productos.php','cup-hot'],
        ['categorias','Categorías','/admin/categorias.php','tags'],
        ['pedidos','Pedidos','/admin/pedidos.php','receipt'],
        ['usuarios','Usuarios','/admin/usuarios.php','people'],
        ['reportes','Reportes','/admin/reportes.php','bar-chart'],
    ],
    'mesero' => [
        ['dashboard','Dashboard','/mesero/dashboard.php','speedometer2'],
        ['nuevo','Nuevo pedido','/mesero/nuevo-pedido.php','plus-circle'],
        ['pedidos','Mis pedidos','/mesero/pedidos.php','list-check'],
        ['mesas','Mesas','/mesero/mesas.php','grid-3x3-gap'],
    ],
    'cocina' => [
        ['dashboard','Dashboard','/cocina/dashboard.php','speedometer2'],
        ['pendientes','Pendientes','/cocina/pedidos-pendientes.php','hourglass-split'],
        ['listos','Listos','/cocina/pedidos-listos.php','check2-circle'],
    ],
];
$menu = $menus[$role] ?? [];
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title ?? 'Panel · UKUMARI') ?></title>
<?php
$fav = null; $fav_mime = 'image/svg+xml';
if (file_exists(__DIR__ . '/../assets/img/favicon.svg')) {
    $fav = '/assets/img/favicon.svg';
} else {
    $mimes = ['png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','webp'=>'image/webp'];
    foreach (['logo.png','logo.webp','logo.jpg','logo.jpeg'] as $f) {
        if (file_exists(__DIR__ . '/../assets/img/' . $f)) {
            $fav = '/assets/img/' . $f;
            $fav_mime = $mimes[strtolower(pathinfo($f, PATHINFO_EXTENSION))] ?? 'image/png';
            break;
        }
    }
}
?>
<link rel="icon" type="<?= e($fav_mime) ?>" href="<?= e($fav) ?>">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@500;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="/assets/css/styles.css" rel="stylesheet">
</head>
<body>
<div class="panel-shell">
  <aside class="panel-side">
    <a class="uku-brand uku-brand-light" href="/">
      <?php
        $panel_logo = null;
        foreach (['logo.png','logo.svg','logo.jpg','logo.jpeg','logo.webp'] as $f) {
          if (file_exists(__DIR__ . '/../assets/img/' . $f)) { $panel_logo = '/assets/img/' . $f; break; }
        }
      ?>
      <?php if ($panel_logo): ?>
        <img src="<?= e($panel_logo) ?>" alt="UKUMARI" class="brand-logo">
      <?php else: ?>
        <span class="brand-mark">U</span>
      <?php endif; ?>
      <span class="brand-text">UKUMARI <small><?= e(ucfirst($role)) ?></small></span>
    </a>
    <div class="side-title">Menú</div>
    <?php foreach ($menu as $m):
      [$slug,$label,$href,$icon] = $m;
      $cls = ($slug === $active) ? 'active' : '';
    ?>
      <a class="<?= $cls ?>" href="<?= e($href) ?>"><i class="bi bi-<?= e($icon) ?>"></i> <?= e($label) ?></a>
    <?php endforeach; ?>
    <div class="side-title">Sesión</div>
    <a href="/"><i class="bi bi-house"></i> Ver sitio</a>
    <a href="/logout.php"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a>
  </aside>

  <main class="panel-main">
    <div class="panel-topbar">
      <h1><?= e($page_title ?? 'Panel') ?></h1>
      <div class="d-flex align-items-center gap-3">
        <?php if (in_array($user['rol'] ?? '', ['mesero','administrador'], true)): ?>
          <a href="/mesero/pedidos.php" id="readyBell" class="position-relative text-decoration-none"
             title="Pedidos listos para entregar" style="color:var(--uku-coffee-700);font-size:1.4rem">
            <i class="bi bi-bell"></i>
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  id="readyBadge" style="display:none">0</span>
          </a>
        <?php endif; ?>
        <div class="text-muted small">
          <i class="bi bi-person-circle"></i>
          <?= e($user['nombre']) ?> · <?= e($user['rol']) ?>
        </div>
      </div>
    </div>
