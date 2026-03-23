<?php

// Prefer shared app configuration when available.
$configPath = __DIR__ . '/../includes/config.php';
if (file_exists($configPath)) {
    require_once $configPath;
}

$host = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
$db   = defined('DB_NAME') ? DB_NAME : 'velvetvogue_db';
$user = defined('DB_USER') ? DB_USER : 'root';
$pass = defined('DB_PASS') ? DB_PASS : '';
$charset = 'utf8mb4';

$dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$pdo = new PDO($dsn, $user, $pass, $options);