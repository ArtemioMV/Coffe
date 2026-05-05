<?php
// Configuración general de la aplicación UKUMARI
date_default_timezone_set('America/Lima');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('APP_NAME', 'UKUMARI');
define('APP_TAGLINE', 'Café de especialidad');
define('APP_URL', '/');
define('IGV_RATE', 0.18); // 18% IGV Perú
define('CURRENCY', 'S/');

// WhatsApp del local (sin "+", solo dígitos en formato internacional)
// Cambia esto al número real del negocio.
define('WHATSAPP_NUMBER', '51999000000');
define('WHATSAPP_DISPLAY', '+51 999 000 000');

define('DB_HOST', getenv('DB_HOST') ?: 'mysql');
define('DB_NAME', getenv('DB_NAME') ?: 'ukumari_db');
define('DB_USER', getenv('DB_USER') ?: 'ukumari_user');
define('DB_PASS', getenv('DB_PASS') ?: 'ukumari_pass');
define('DB_CHARSET', 'utf8mb4');
