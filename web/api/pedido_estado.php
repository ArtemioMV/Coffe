<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');
require_login('/login.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok'=>false,'msg'=>'método no permitido']); exit;
}
if (!csrf_check($_POST['_csrf'] ?? null)) {
    echo json_encode(['ok'=>false,'msg'=>'CSRF inválido']); exit;
}

$pedido_id = (int)($_POST['pedido_id'] ?? 0);
$estado_id = (int)($_POST['estado_id'] ?? 0);
$rol = current_role();

// Permisos por rol y transición
$allowed = match ($rol) {
    'cocina'        => [2,3],     // en preparación, listo
    'mesero'        => [4],       // entregado
    'administrador' => [1,2,3,4,5],
    default         => [],
};
if (!in_array($estado_id, $allowed, true)) {
    echo json_encode(['ok'=>false,'msg'=>'Sin permiso para ese estado']); exit;
}

try {
    cambiar_estado_pedido($pedido_id, $estado_id);
    // Si se entrega o cancela, liberar mesa
    if (in_array($estado_id, [4,5], true)) {
        $stmt = db()->prepare("SELECT mesa_id FROM pedidos WHERE id=?");
        $stmt->execute([$pedido_id]);
        $row = $stmt->fetch();
        if ($row && $row['mesa_id']) {
            db()->prepare("UPDATE mesas SET estado='libre' WHERE id=?")->execute([$row['mesa_id']]);
        }
    }
    echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
    echo json_encode(['ok'=>false,'msg'=>$e->getMessage()]);
}
