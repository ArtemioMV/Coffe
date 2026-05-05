<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    echo json_encode(['ok' => false, 'msg' => 'JSON inválido']); exit;
}

if (!csrf_check($body['_csrf'] ?? null)) {
    echo json_encode(['ok' => false, 'msg' => 'CSRF inválido']); exit;
}

if (!is_logged_in()) {
    echo json_encode(['ok' => false, 'msg' => 'Debes iniciar sesión']); exit;
}

$user = current_user();
$rol  = $user['rol'];
$args = [
    'tipo_pedido'   => $body['tipo_pedido']   ?? 'recojo',
    'metodo_pago'   => $body['metodo_pago']   ?? null,
    'observaciones' => $body['observaciones'] ?? null,
    'items'         => $body['items']         ?? [],
];

$isStaffMesaOrder = $rol === 'mesero'
    || ($rol === 'administrador' && (!empty($body['mesa_id']) || (($body['tipo_pedido'] ?? '') === 'mesa')));

if ($isStaffMesaOrder) {
    $args['mesero_id'] = (int)$user['id'];
    $args['mesa_id']   = !empty($body['mesa_id']) ? (int)$body['mesa_id'] : null;
    $args['tipo_pedido'] = 'mesa';

    if (!empty($body['usuario_id'])) {
        $clienteId = (int)$body['usuario_id'];
        $stmt = db()->prepare("
            SELECT u.id
            FROM usuarios u
            INNER JOIN roles r ON r.id = u.rol_id
            WHERE u.id = ? AND u.activo = 1 AND r.nombre = 'cliente'
            LIMIT 1
        ");
        $stmt->execute([$clienteId]);
        if (!$stmt->fetchColumn()) {
            echo json_encode(['ok' => false, 'msg' => 'Cliente no válido']); exit;
        }
        $args['usuario_id'] = $clienteId;
    }
} else {
    $args['usuario_id'] = (int)$user['id'];
}

$res = crear_pedido($args);
echo json_encode($res);
