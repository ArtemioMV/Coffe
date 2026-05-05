<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/helpers.php';

if (is_logged_in()) {
    redirect(home_for_role(current_role()) ?: '/');
}

$error = null; $ok = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['_csrf'] ?? null)) {
        $error = 'Sesión inválida, recarga la página.';
    } else {
        $nombre   = trim($_POST['nombre']   ?? '');
        $correo   = trim($_POST['correo']   ?? '');
        $telefono = trim($_POST['telefono'] ?? '');
        $pass     = $_POST['password']      ?? '';
        $pass2    = $_POST['password2']     ?? '';

        if (!$nombre || !$correo || !$pass) {
            $error = 'Completa los campos obligatorios.';
        } elseif (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $error = 'Correo inválido.';
        } elseif (strlen($pass) < 6) {
            $error = 'La contraseña debe tener al menos 6 caracteres.';
        } elseif ($pass !== $pass2) {
            $error = 'Las contraseñas no coinciden.';
        } else {
            try {
                $stmt = db()->prepare("SELECT id FROM usuarios WHERE correo = ?");
                $stmt->execute([$correo]);
                if ($stmt->fetch()) {
                    $error = 'Ese correo ya está registrado.';
                } else {
                    $hash = password_hash($pass, PASSWORD_DEFAULT);
                    $stmt = db()->prepare("
                        INSERT INTO usuarios (rol_id, nombre, correo, telefono, password, activo)
                        VALUES (1, ?, ?, ?, ?, 1)
                    ");
                    $stmt->execute([$nombre, $correo, $telefono ?: null, $hash]);
                    // login automático
                    login_user($correo, $pass);
                    $ok = true;
                }
            } catch (Throwable $e) {
                $error = 'No se pudo registrar: ' . $e->getMessage();
            }
        }
    }
}

$page = 'registro';
$title = 'Crear cuenta · UKUMARI';
require __DIR__ . '/includes/header.php';
?>

<section class="auth-wrap">
  <div class="auth-art d-none d-lg-flex">
    <span class="script" style="color:#f5d39e;font-size:1.6rem">Únete a UKUMARI</span>
    <h2>Tu café como te gusta,<br>siempre listo.</h2>
    <p>Crea tu cuenta y guarda tus pedidos, recibe novedades y arma tu carrito en segundos.</p>
  </div>
  <div class="auth-form">
    <div class="form-box">
      <h3 class="mb-1">Crear cuenta</h3>
      <p class="text-muted mb-4">Es gratis y rápido.</p>

      <?php if ($ok): ?>
        <div class="alert alert-success">¡Cuenta creada! Redirigiendo…</div>
        <script>setTimeout(()=>location.href='/',1200)</script>
      <?php endif; ?>
      <?php if ($error): ?>
        <div class="alert alert-danger"><?= e($error) ?></div>
      <?php endif; ?>

      <form method="post" autocomplete="on">
        <?= csrf_field() ?>
        <div class="mb-3">
          <label class="form-label">Nombre completo *</label>
          <input type="text" name="nombre" class="form-control" required
                 value="<?= e($_POST['nombre'] ?? '') ?>">
        </div>
        <div class="mb-3">
          <label class="form-label">Correo *</label>
          <input type="email" name="correo" class="form-control" required
                 value="<?= e($_POST['correo'] ?? '') ?>">
        </div>
        <div class="mb-3">
          <label class="form-label">Teléfono</label>
          <input type="tel" name="telefono" class="form-control"
                 value="<?= e($_POST['telefono'] ?? '') ?>">
        </div>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label">Contraseña *</label>
            <input type="password" name="password" class="form-control" required minlength="6">
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">Repetir contraseña *</label>
            <input type="password" name="password2" class="form-control" required minlength="6">
          </div>
        </div>
        <button class="btn btn-uku w-100"><i class="bi bi-person-plus"></i> Crear cuenta</button>
      </form>
      <p class="text-center mt-4 mb-0 small">
        ¿Ya tienes cuenta? <a href="/login.php" class="text-gold fw-semibold">Inicia sesión</a>
      </p>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
