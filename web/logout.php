<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';
logout_user();
header('Location: /');
exit;
