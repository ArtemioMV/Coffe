<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

function is_logged_in(): bool {
    return isset($_SESSION['user']);
}

function current_role(): ?string {
    return $_SESSION['user']['rol'] ?? null;
}

function login_user(string $correo, string $password): array {
    $stmt = db()->prepare("
        SELECT u.id, u.nombre, u.correo, u.password, u.activo, r.nombre AS rol
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.rol_id
        WHERE u.correo = :c
        LIMIT 1
    ");
    $stmt->execute([':c' => $correo]);
    $u = $stmt->fetch();
    if (!$u) {
        return ['ok' => false, 'msg' => 'Correo o contraseña inválidos'];
    }
    if ((int)$u['activo'] !== 1) {
        return ['ok' => false, 'msg' => 'Usuario inactivo'];
    }
    if (!password_verify($password, $u['password'])) {
        return ['ok' => false, 'msg' => 'Correo o contraseña inválidos'];
    }
    unset($u['password']);
    $_SESSION['user'] = $u;
    return ['ok' => true, 'user' => $u];
}

function logout_user(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function require_login(string $redirect = '/login.php'): void {
    if (!is_logged_in()) {
        header('Location: ' . $redirect);
        exit;
    }
}

function require_role($roles, string $redirect = '/login.php'): void {
    require_login($redirect);
    $roles = (array)$roles;
    if (!in_array(current_role(), $roles, true)) {
        http_response_code(403);
        echo "<!doctype html><meta charset='utf-8'><title>403</title>
              <div style='font-family:system-ui;padding:40px;text-align:center'>
                <h1>403 — Acceso restringido</h1>
                <p>No tienes permisos para acceder a esta sección.</p>
                <a href='/'>Volver al inicio</a>
              </div>";
        exit;
    }
}

function home_for_role(string $rol): string {
    return match ($rol) {
        'administrador' => '/admin/dashboard.php',
        'mesero'        => '/mesero/dashboard.php',
        'cocina'        => '/cocina/dashboard.php',
        default         => '/',
    };
}
