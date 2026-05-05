<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/helpers.php';

$pdo = db();
$msg = null; $err = null;
$linkSimulado = null;

$token = $_GET['token'] ?? null;
$step = $token ? 'reset' : 'solicitar';

if ($step === 'solicitar' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['_csrf'] ?? null)) { $err = 'Sesión inválida.'; }
    else {
        $correo = trim($_POST['correo'] ?? '');
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ? AND activo = 1");
        $stmt->execute([$correo]);
        $u = $stmt->fetch();
        if ($u) {
            $tk = bin2hex(random_bytes(24));
            $exp = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');
            $pdo->prepare("INSERT INTO password_resets (usuario_id, token, expira) VALUES (?,?,?)")
                ->execute([$u['id'], $tk, $exp]);
            // Simulamos el envío de correo: mostramos el link
            $linkSimulado = "/recuperar.php?token=$tk";
        }
        // Mensaje genérico (no revelar existencia del correo)
        $msg = 'Si el correo existe, hemos generado un enlace de recuperación.';
    }
}

if ($step === 'reset' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['_csrf'] ?? null)) { $err = 'Sesión inválida.'; }
    else {
        $pass  = $_POST['password']  ?? '';
        $pass2 = $_POST['password2'] ?? '';
        if (strlen($pass) < 6) { $err = 'La contraseña debe tener al menos 6 caracteres.'; }
        elseif ($pass !== $pass2) { $err = 'Las contraseñas no coinciden.'; }
        else {
            $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE token=? AND usado=0 AND expira > NOW() LIMIT 1");
            $stmt->execute([$token]);
            $row = $stmt->fetch();
            if (!$row) { $err = 'Enlace inválido o expirado.'; }
            else {
                $hash = password_hash($pass, PASSWORD_DEFAULT);
                $pdo->prepare("UPDATE usuarios SET password=? WHERE id=?")->execute([$hash, $row['usuario_id']]);
                $pdo->prepare("UPDATE password_resets SET usado=1 WHERE id=?")->execute([$row['id']]);
                flash_set('after_reset', '1');
                redirect('/login.php?reset=1');
            }
        }
    }
}

$page = 'recuperar';
$title = 'Recuperar contraseña · UKUMARI';
require __DIR__ . '/includes/header.php';
?>

<section class="auth-wrap">
  <div class="auth-art d-none d-lg-flex">
    <span class="script" style="color:#f5d39e;font-size:1.6rem">¿Olvidaste tu clave?</span>
    <h2>Recupera el acceso<br>en un par de pasos.</h2>
    <p>Te enviaremos un enlace temporal para que crees una contraseña nueva.</p>
  </div>
  <div class="auth-form">
    <div class="form-box">

      <?php if ($step === 'solicitar'): ?>
        <h3 class="mb-1">Recuperar contraseña</h3>
        <p class="text-muted mb-4">Ingresa tu correo registrado.</p>

        <?php if ($msg): ?><div class="alert alert-info"><?= e($msg) ?></div><?php endif; ?>
        <?php if ($linkSimulado): ?>
          <div class="alert alert-warning small">
            <i class="bi bi-info-circle"></i>
            <strong>Modo demo:</strong> en producción este enlace se enviaría por email.
            <a href="<?= e($linkSimulado) ?>" class="d-block mt-2 text-uku fw-semibold">Continuar al cambio de contraseña →</a>
          </div>
        <?php endif; ?>
        <?php if ($err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endif; ?>

        <form method="post">
          <?= csrf_field() ?>
          <div class="mb-3">
            <label class="form-label">Correo</label>
            <input type="email" name="correo" class="form-control" required autofocus>
          </div>
          <button class="btn btn-uku w-100"><i class="bi bi-envelope-arrow-up"></i> Enviar enlace</button>
        </form>
        <p class="text-center mt-4 mb-0 small">
          <a href="/login.php" class="text-gold fw-semibold">← Volver a iniciar sesión</a>
        </p>

      <?php else: ?>
        <h3 class="mb-1">Nueva contraseña</h3>
        <p class="text-muted mb-4">Define una contraseña segura.</p>

        <?php if ($err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endif; ?>

        <form method="post">
          <?= csrf_field() ?>
          <div class="mb-3">
            <label class="form-label">Nueva contraseña</label>
            <input type="password" name="password" class="form-control" required minlength="6">
          </div>
          <div class="mb-3">
            <label class="form-label">Repetir contraseña</label>
            <input type="password" name="password2" class="form-control" required minlength="6">
          </div>
          <button class="btn btn-uku w-100"><i class="bi bi-check2-circle"></i> Guardar nueva contraseña</button>
        </form>
      <?php endif; ?>

    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
