<?php
// ============================================================
// UKUMARI · Configuración general
// Lee variables de entorno (definidas en .env vía docker-compose).
// Cada constante tiene fallback razonable para que el sitio
// funcione incluso si algunas vars no están definidas.
// ============================================================

function env_str(string $key, string $default = ''): string {
    $v = getenv($key);
    return ($v === false || $v === '') ? $default : $v;
}
function env_num(string $key, float $default): float {
    $v = getenv($key);
    return ($v === false || $v === '') ? $default : (float)$v;
}

date_default_timezone_set(env_str('APP_TIMEZONE', 'America/Lima'));

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('APP_NAME',     env_str('APP_NAME', 'UKUMARI'));
define('APP_TAGLINE',  'Café de especialidad');
define('APP_URL',      '/');
define('IGV_RATE',     env_num('IGV_RATE', 0.18));
define('CURRENCY',     env_str('CURRENCY', 'S/'));

// Base de datos
define('DB_HOST',    env_str('DB_HOST', 'mysql'));
define('DB_NAME',    env_str('DB_NAME', 'ukumari_db'));
define('DB_USER',    env_str('DB_USER', 'ukumari_user'));
define('DB_PASS',    env_str('DB_PASS', 'ukumari_pass'));
define('DB_CHARSET', 'utf8mb4');

// WhatsApp del local
define('WHATSAPP_NUMBER',  env_str('WHATSAPP_NUMBER',  '51999000000'));
define('WHATSAPP_DISPLAY', env_str('WHATSAPP_DISPLAY', '+51 999 000 000'));
