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

if ($rol === 'mesero') {
    $args['mesero_id'] = (int)$user['id'];
    $args['mesa_id']   = !empty($body['mesa_id']) ? (int)$body['mesa_id'] : null;
    $args['tipo_pedido'] = 'mesa';
} else {
    $args['usuario_id'] = (int)$user['id'];
}

$res = crear_pedido($args);
echo json_encode($res);
