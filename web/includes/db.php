<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $opt = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        // Reintentar en arranque (mysql puede tardar en estar listo)
        $tries = 0;
        while (true) {
            try {
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $opt);
                break;
            } catch (PDOException $e) {
                if (++$tries > 20) { throw $e; }
                sleep(2);
            }
        }
        ensure_seed_users($pdo);
    }
    return $pdo;
}

// Reemplaza placeholders SEED::xxx por hashes reales con password_hash().
// Idempotente: solo actualiza filas que aún tengan el placeholder.
function ensure_seed_users(PDO $pdo): void {
    try {
        $stmt = $pdo->query("SELECT id, password FROM usuarios WHERE password LIKE 'SEED::%'");
        $rows = $stmt->fetchAll();
        if (!$rows) return;
        $upd = $pdo->prepare("UPDATE usuarios SET password = :p WHERE id = :id");
        foreach ($rows as $r) {
            $plain = substr($r['password'], 6); // quitar prefijo SEED::
            $hash  = password_hash($plain, PASSWORD_DEFAULT);
            $upd->execute([':p' => $hash, ':id' => $r['id']]);
        }
    } catch (Throwable $e) {
        // silencioso: si falla seed, login simplemente no funcionará para semillas
    }
}
