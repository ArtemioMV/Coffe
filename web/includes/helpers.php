<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function e(?string $v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money($n): string {
    return CURRENCY . ' ' . number_format((float)$n, 2, '.', ',');
}

function flash_set(string $key, string $msg): void {
    $_SESSION['_flash'][$key] = $msg;
}
function flash_get(string $key): ?string {
    if (!empty($_SESSION['_flash'][$key])) {
        $m = $_SESSION['_flash'][$key];
        unset($_SESSION['_flash'][$key]);
        return $m;
    }
    return null;
}

function redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

function get_categorias(bool $solo_activas = true): array {
    $sql = "SELECT * FROM categorias" . ($solo_activas ? " WHERE activo = 1" : "") . " ORDER BY orden, nombre";
    return db()->query($sql)->fetchAll();
}

function get_productos_por_categoria(bool $solo_activos = true): array {
    $sql = "SELECT p.*, c.nombre AS categoria, c.orden AS cat_orden
            FROM productos p
            INNER JOIN categorias c ON c.id = p.categoria_id
            WHERE 1=1
            " . ($solo_activos ? " AND p.activo = 1 AND c.activo = 1" : "") . "
            ORDER BY c.orden, c.nombre, p.nombre";
    $rows = db()->query($sql)->fetchAll();
    $grouped = [];
    foreach ($rows as $r) {
        $grouped[$r['categoria']][] = $r;
    }
    return $grouped;
}

function get_estado_nombre(int $id): string {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        foreach (db()->query("SELECT id,nombre FROM estados_pedido")->fetchAll() as $r) {
            $cache[(int)$r['id']] = $r['nombre'];
        }
    }
    return $cache[$id] ?? 'desconocido';
}

function badge_estado(string $estado): string {
    $map = [
        'pendiente'      => 'bg-warning text-dark',
        'en preparación' => 'bg-info text-dark',
        'listo'          => 'bg-primary',
        'entregado'      => 'bg-success',
        'cancelado'      => 'bg-secondary',
    ];
    $cls = $map[$estado] ?? 'bg-secondary';
    return "<span class='badge {$cls}'>" . e($estado) . "</span>";
}

function csrf_token(): string {
    if (empty($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['_csrf'];
}
function csrf_check(?string $t): bool {
    return !empty($t) && hash_equals($_SESSION['_csrf'] ?? '', $t);
}
function csrf_field(): string {
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

/**
 * Crea pedido + detalle dentro de transacción.
 * $items: [['producto_id'=>int,'cantidad'=>int,'observacion'=>?string], ...]
 */
function crear_pedido(array $args): array {
    $usuario_id   = $args['usuario_id']   ?? null;
    $mesero_id    = $args['mesero_id']    ?? null;
    $mesa_id      = $args['mesa_id']      ?? null;
    $tipo_pedido  = $args['tipo_pedido']  ?? 'recojo';
    $observacion  = $args['observaciones']?? null;
    $metodo_pago  = $args['metodo_pago']  ?? null;
    $items        = $args['items']        ?? [];

    if (!$items) {
        return ['ok' => false, 'msg' => 'El carrito está vacío'];
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $ids = array_map(fn($i) => (int)$i['producto_id'], $items);
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT id, nombre, precio, activo FROM productos WHERE id IN ($in)");
        $stmt->execute($ids);
        $prods = [];
        foreach ($stmt->fetchAll() as $p) {
            $prods[(int)$p['id']] = $p;
        }

        $subtotal = 0.0;
        $detalle  = [];
        foreach ($items as $it) {
            $pid = (int)$it['producto_id'];
            $qty = max(1, (int)($it['cantidad'] ?? 1));
            $obs = $it['observacion'] ?? null;
            if (!isset($prods[$pid]) || (int)$prods[$pid]['activo'] !== 1) {
                throw new RuntimeException("Producto {$pid} no disponible");
            }
            $pu  = (float)$prods[$pid]['precio'];
            $sub = $pu * $qty;
            $subtotal += $sub;
            $detalle[] = [$pid, $qty, $pu, $sub, $obs];
        }

        $igv   = round($subtotal * IGV_RATE / (1 + IGV_RATE), 2); // IGV ya incluido
        $base  = round($subtotal - $igv, 2);
        $total = round($subtotal, 2);

        $stmt = $pdo->prepare("
            INSERT INTO pedidos
                (usuario_id, mesero_id, mesa_id, estado_id, tipo_pedido,
                 subtotal, igv, total, observaciones, metodo_pago)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $usuario_id, $mesero_id, $mesa_id, $tipo_pedido,
            $base, $igv, $total, $observacion, $metodo_pago
        ]);
        $pedido_id = (int)$pdo->lastInsertId();

        $stmtD = $pdo->prepare("
            INSERT INTO detalle_pedido
                (pedido_id, producto_id, cantidad, precio_unitario, subtotal, observacion)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        foreach ($detalle as $d) {
            $stmtD->execute([$pedido_id, $d[0], $d[1], $d[2], $d[3], $d[4]]);
        }

        if ($metodo_pago) {
            $stmt = $pdo->prepare("INSERT INTO pagos (pedido_id, metodo, monto, estado) VALUES (?, ?, ?, 'pendiente')");
            $stmt->execute([$pedido_id, $metodo_pago, $total]);
        }

        if ($mesa_id) {
            $pdo->prepare("UPDATE mesas SET estado='ocupada' WHERE id = ?")->execute([$mesa_id]);
        }

        $pdo->commit();

        // Puntos: solo si el pedido queda asociado a un cliente registrado.
        if ($usuario_id) {
            $ganados = (int) floor($total * PUNTOS_POR_SOL);
            if ($ganados > 0) {
                sumar_puntos((int)$usuario_id, $ganados, $pedido_id, "Pedido #$pedido_id");
            }
        }

        return ['ok' => true, 'pedido_id' => $pedido_id, 'total' => $total];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['ok' => false, 'msg' => $e->getMessage()];
    }
}

function get_pedidos(array $filtros = []): array {
    $where = [];
    $args  = [];
    if (!empty($filtros['estado_id'])) { $where[] = 'p.estado_id = ?';   $args[] = $filtros['estado_id']; }
    if (!empty($filtros['estados_in'])) {
        $in = implode(',', array_fill(0, count($filtros['estados_in']), '?'));
        $where[] = "p.estado_id IN ($in)";
        $args = array_merge($args, $filtros['estados_in']);
    }
    if (!empty($filtros['mesero_id']))  { $where[] = 'p.mesero_id = ?';  $args[] = $filtros['mesero_id']; }
    if (!empty($filtros['usuario_id'])) { $where[] = 'p.usuario_id = ?'; $args[] = $filtros['usuario_id']; }
    if (!empty($filtros['hoy']))        { $where[] = 'DATE(p.creado_en) = CURDATE()'; }

    $sqlW = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT p.*, e.nombre AS estado, m.numero AS mesa_numero,
                   u.nombre AS cliente_nombre, ms.nombre AS mesero_nombre
            FROM pedidos p
            INNER JOIN estados_pedido e ON e.id = p.estado_id
            LEFT JOIN mesas m ON m.id = p.mesa_id
            LEFT JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN usuarios ms ON ms.id = p.mesero_id
            $sqlW
            ORDER BY p.creado_en DESC
            LIMIT 200";
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}

function get_pedido_detalle(int $pedido_id): array {
    $stmt = db()->prepare("
        SELECT d.*, p.nombre AS producto
        FROM detalle_pedido d
        INNER JOIN productos p ON p.id = d.producto_id
        WHERE d.pedido_id = ?
    ");
    $stmt->execute([$pedido_id]);
    return $stmt->fetchAll();
}

function cambiar_estado_pedido(int $pedido_id, int $nuevo_estado_id): void {
    db()->prepare("UPDATE pedidos SET estado_id = ? WHERE id = ?")
        ->execute([$nuevo_estado_id, $pedido_id]);
}

// =============== Sistema de puntos UKUMARI ===============
// Reglas configurables vía .env (PUNTOS_POR_SOL, PUNTOS_CANJE_BLOQUE, SOLES_POR_BLOQUE_CANJE).
defined('PUNTOS_POR_SOL')          || define('PUNTOS_POR_SOL',          (int) env_num('PUNTOS_POR_SOL', 1));
defined('PUNTOS_CANJE_BLOQUE')     || define('PUNTOS_CANJE_BLOQUE',     (int) env_num('PUNTOS_CANJE_BLOQUE', 100));
defined('SOLES_POR_BLOQUE_CANJE')  || define('SOLES_POR_BLOQUE_CANJE',  env_num('SOLES_POR_BLOQUE_CANJE', 5));

function sumar_puntos(int $usuario_id, int $puntos, ?int $pedido_id = null, string $desc = ''): void {
    if ($puntos <= 0) return;
    $pdo = db();
    $pdo->prepare("UPDATE usuarios SET puntos = puntos + ? WHERE id = ?")->execute([$puntos, $usuario_id]);
    $pdo->prepare("INSERT INTO puntos_movimientos (usuario_id, pedido_id, tipo, puntos, descripcion) VALUES (?, ?, 'ganados', ?, ?)")
        ->execute([$usuario_id, $pedido_id, $puntos, $desc ?: 'Ganados por compra']);
}

function canjear_puntos(int $usuario_id, int $puntos): array {
    if ($puntos <= 0 || $puntos % PUNTOS_CANJE_BLOQUE !== 0) {
        return ['ok'=>false,'msg'=>'Solo se pueden canjear bloques de ' . PUNTOS_CANJE_BLOQUE];
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT puntos FROM usuarios WHERE id=? FOR UPDATE");
        $stmt->execute([$usuario_id]);
        $cur = (int)$stmt->fetchColumn();
        if ($cur < $puntos) throw new RuntimeException('Puntos insuficientes');
        $pdo->prepare("UPDATE usuarios SET puntos = puntos - ? WHERE id=?")->execute([$puntos, $usuario_id]);
        $pdo->prepare("INSERT INTO puntos_movimientos (usuario_id, tipo, puntos, descripcion) VALUES (?, 'canjeados', ?, ?)")
            ->execute([$usuario_id, $puntos, "Canje por descuento"]);
        $pdo->commit();
        $descuento = ($puntos / PUNTOS_CANJE_BLOQUE) * SOLES_POR_BLOQUE_CANJE;
        return ['ok'=>true,'descuento'=>$descuento];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['ok'=>false,'msg'=>$e->getMessage()];
    }
}

function get_puntos_movimientos(int $usuario_id, int $limit = 50): array {
    $stmt = db()->prepare("SELECT * FROM puntos_movimientos WHERE usuario_id = ? ORDER BY creado_en DESC LIMIT ?");
    $stmt->bindValue(1, $usuario_id, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
