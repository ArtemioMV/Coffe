<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/helpers.php';

if (is_logged_in()) {
    redirect(home_for_role(current_role()) ?: '/');
}

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['_csrf'] ?? null)) {
        $error = 'Sesión inválida, recarga la página.';
    } else {
        $r = login_user(trim($_POST['correo'] ?? ''), $_POST['password'] ?? '');
        if ($r['ok']) {
            redirect(home_for_role($r['user']['rol']) ?: '/');
        } else {
            $error = $r['msg'];
        }
    }
}

$page = 'login';
$title = 'Iniciar sesión · UKUMARI';
require __DIR__ . '/includes/header.php';
?>

<section class="auth-wrap">
  <div class="auth-art d-none d-lg-flex">
    <span class="script" style="color:#f5d39e;font-size:1.6rem">Bienvenido de nuevo</span>
    <h2>Tu café favorito,<br>te está esperando.</h2>
    <p>Inicia sesión y completa tu pedido. ¿Aún no tienes cuenta? Crear una toma menos de un minuto.</p>
  </div>
  <div class="auth-form">
    <div class="form-box">
      <h3 class="mb-1">Iniciar sesión</h3>
      <p class="text-muted mb-4">Ingresa con tu correo y contraseña.</p>

      <?php if ($error): ?>
        <div class="alert alert-danger"><?= e($error) ?></div>
      <?php endif; ?>
      <?php if (!empty($_GET['reset'])): ?>
        <div class="alert alert-success">Contraseña actualizada. Inicia sesión con tu nueva contraseña.</div>
      <?php endif; ?>

      <form method="post" autocomplete="on">
        <?= csrf_field() ?>
        <div class="mb-3">
          <label class="form-label">Correo</label>
          <input type="email" name="correo" class="form-control" required autofocus
                 value="<?= e($_POST['correo'] ?? '') ?>">
        </div>
        <div class="mb-3">
          <label class="form-label">Contraseña</label>
          <input type="password" name="password" class="form-control" required>
        </div>
        <div class="d-flex justify-content-end mb-3">
          <a href="/recuperar.php" class="small text-uku">¿Olvidaste tu contraseña?</a>
        </div>
        <button class="btn btn-uku w-100"><i class="bi bi-box-arrow-in-right"></i> Ingresar</button>
      </form>
      <p class="text-center mt-4 mb-0 small">
        ¿No tienes cuenta? <a href="/registro.php" class="text-gold fw-semibold">Regístrate</a>
      </p>
      <details class="mt-4 small text-muted">
        <summary>Credenciales demo</summary>
        <ul class="mt-2 mb-0">
          <li>admin@ukumari.com / Admin123</li>
          <li>mesero@ukumari.com / Mesero123</li>
          <li>cocina@ukumari.com / Cocina123</li>
          <li>cliente@ukumari.com / Cliente123</li>
        </ul>
      </details>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
