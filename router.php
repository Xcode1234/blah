<?php
/**
 * Simple router for PHP development server
 * This file handles routing when using: php -S localhost:8000 router.php
 * Routes all requests to index.html unless they match specific patterns
 */

$requested_file = $_SERVER['REQUEST_URI'];

// Remove query string for file checking
$request_path = parse_url($requested_file, PHP_URL_PATH);

// Remove leading slash
$request_path = ltrim($request_path, '/');

// List of paths that should be routed to actual files/directories
$static_paths = [
    'api',
    'assets',
    'data',
    'includes',
    'pages',
    'logs',
];

// Check if request is for a static file or API endpoint
foreach ($static_paths as $path) {
    if (strpos($request_path, $path . '/') === 0 || $request_path === $path) {
        // Let the server serve the actual file/directory
        return false;
    }
}

// Check if file exists and is not a directory
$file_path = __DIR__ . '/' . $request_path;
if ($request_path !== '' && is_file($file_path)) {
    return false;
}

// For root path or all other requests, serve index.html
require __DIR__ . '/index.html';
?>
