<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';
$user = current_user();
$page = $page ?? 'home';
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title ?? APP_NAME . ' — ' . APP_TAGLINE) ?></title>
<?php
// Favicon: preferimos /assets/img/favicon.svg porque está enmascarado en
// círculo (con el logo embebido). Sólo si no existe, caemos al logo.* directo.
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
<link rel="apple-touch-icon" href="<?= e($fav) ?>">

<link href="https://fonts.googleapis.com" rel="preconnect">
<link href="https://fonts.gstatic.com" rel="preconnect" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@500;700&display=swap" rel="stylesheet">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" rel="stylesheet">
<link href="/assets/css/styles.css" rel="stylesheet">
<link href="/assets/css/local-images.css" rel="stylesheet">
</head>
<?php
// Logo personalizado opcional: si el usuario coloca /assets/img/logo.png o .svg,
// se usará en lugar del brand-mark con la "U".
$logo_path = null;
foreach (['logo.png','logo.svg','logo.jpg','logo.jpeg','logo.webp'] as $f) {
    if (file_exists(__DIR__ . '/../assets/img/' . $f)) { $logo_path = '/assets/img/' . $f; break; }
}
?>
<body class="page-<?= e($page) ?>">

<nav class="navbar navbar-expand-lg uku-nav fixed-top">
  <div class="container">
    <a class="navbar-brand uku-brand" href="/">
      <?php if ($logo_path): ?>
        <img src="<?= e($logo_path) ?>" alt="UKUMARI" class="brand-logo">
      <?php else: ?>
        <span class="brand-mark">U</span>
      <?php endif; ?>
      <span class="brand-text">
        UKUMARI
        <small>Café de especialidad</small>
      </span>
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
      <i class="bi bi-list"></i>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
        <li class="nav-item"><a class="nav-link <?= $page==='home'?'active':'' ?>" href="/">Inicio</a></li>
        <li class="nav-item"><a class="nav-link <?= $page==='carta'?'active':'' ?>" href="/carta.php">Carta</a></li>
        <li class="nav-item"><a class="nav-link" href="/#nosotros">Nosotros</a></li>
        <li class="nav-item"><a class="nav-link" href="/#contacto">Contacto</a></li>
        <li class="nav-item">
          <a class="nav-link nav-cart position-relative" href="/carrito.php" title="Carrito">
            <i class="bi bi-bag"></i>
            <span class="badge rounded-pill bg-uku" id="cartCount">0</span>
          </a>
        </li>

        <?php if (!$user): ?>
          <li class="nav-item"><a class="btn btn-outline-uku btn-sm" href="/login.php"><i class="bi bi-person"></i> Iniciar sesión</a></li>
        <?php else: ?>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">
              <i class="bi bi-person-circle"></i> <?= e($user['nombre']) ?>
              <small class="text-muted">(<?= e($user['rol']) ?>)</small>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <?php if ($user['rol']==='administrador'): ?>
                <li><a class="dropdown-item" href="/admin/dashboard.php"><i class="bi bi-speedometer2"></i> Panel admin</a></li>
              <?php elseif ($user['rol']==='mesero'): ?>
                <li><a class="dropdown-item" href="/mesero/dashboard.php"><i class="bi bi-clipboard-check"></i> Panel mesero</a></li>
              <?php elseif ($user['rol']==='cocina'): ?>
                <li><a class="dropdown-item" href="/cocina/dashboard.php"><i class="bi bi-fire"></i> Panel cocina</a></li>
              <?php endif; ?>
              <?php if ($user['rol']==='cliente'): ?>
                <li><a class="dropdown-item" href="/perfil.php"><i class="bi bi-person-badge"></i> Mi cuenta y puntos</a></li>
              <?php endif; ?>
              <li><a class="dropdown-item" href="/carrito.php"><i class="bi bi-bag"></i> Mi carrito</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="/logout.php"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a></li>
            </ul>
          </li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>
<div class="uku-nav-spacer"></div>
