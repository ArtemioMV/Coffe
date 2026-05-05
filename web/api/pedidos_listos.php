<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');

if (!is_logged_in()) { echo json_encode(['ok'=>false]); exit; }
$user = current_user();
if (!in_array($user['rol'], ['mesero','administrador'], true)) {
    echo json_encode(['ok'=>false]); exit;
}

// Pedidos en estado 'listo' (estado_id = 3) atendidos por este mesero.
// Si es admin, devuelve todos los listos.
$sql = "SELECT p.id, p.mesa_id, m.numero AS mesa_numero, p.creado_en
        FROM pedidos p
        LEFT JOIN mesas m ON m.id = p.mesa_id
        WHERE p.estado_id = 3";
$args = [];
if ($user['rol'] === 'mesero') {
    $sql .= " AND p.mesero_id = ?";
    $args[] = $user['id'];
}
$sql .= " ORDER BY p.creado_en ASC";
$stmt = db()->prepare($sql);
$stmt->execute($args);
$rows = $stmt->fetchAll();

echo json_encode([
    'ok'    => true,
    'count' => count($rows),
    'items' => array_map(fn($r) => [
        'id' => (int)$r['id'],
        'mesa' => $r['mesa_numero'],
        'creado_en' => $r['creado_en'],
    ], $rows),
]);
