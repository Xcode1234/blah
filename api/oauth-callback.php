<?php
/**
 * OAuth Callback Handler
 * Receives OAuth provider responses and creates/updates user sessions
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/oauth-handler.php';

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $provider = $_GET['provider'] ?? null;
    $code = $_GET['code'] ?? $_POST['code'] ?? null;
    $state = $_GET['state'] ?? $_POST['state'] ?? null;
    
    if (!$provider || !$code) {
        throw new Exception('Missing OAuth parameters');
    }
    
    // Initialize OAuth handler
    $oauthHandler = new OAuthHandler(Database::getInstance()->getConnection());
    
    // Handle callback
    $user = $oauthHandler->handleCallback($provider, $code, $state);
    
    if (!$user) {
        throw new Exception('Failed to authenticate with ' . ucfirst($provider));
    }
    
    // Create user session with full user data
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['name'] = $user['first_name'] . ' ' . $user['last_name'];
    $_SESSION['first_name'] = $user['first_name'];
    $_SESSION['last_name'] = $user['last_name'];
    $_SESSION['role'] = $user['role'] ?? 'customer';
    $_SESSION['oauth_provider'] = $provider;
    $_SESSION['login_time'] = time();
    
    // Set secure cookies for persistent login (OAuth = remember me by default)
    $cookie_expiry = time() + (30 * 24 * 60 * 60); // 30 days
    $cookie_options = [
        'expires' => $cookie_expiry,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => false, // Allow JavaScript to read these cookies
        'samesite' => 'Strict'
    ];
    
    setcookie('user_id', (int)$user['id'], $cookie_options);
    setcookie('user_email', $user['email'], $cookie_options);
    setcookie('user_name', $user['first_name'] . ' ' . $user['last_name'], $cookie_options);
    setcookie('oauth_provider', $provider, $cookie_options);
    
    // Log the action
    logAction('LOGIN_OAUTH', (int)$user['id'], "OAuth login via $provider: {$user['email']}");
    
    // Save session before redirect
    session_write_close();
    
    // Prepare user data to send to frontend
    $userData = [
        'id' => (int)$user['id'],
        'email' => $user['email'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'name' => trim($user['first_name'] . ' ' . $user['last_name']),
        'role' => $user['role'] ?? 'customer'
    ];
    
    // Determine redirect URL with user data
    $redirect = (isset($_SESSION['pending_checkout']) && $_SESSION['pending_checkout']) ? '/pages/checkout.html' : '/index.html';
    
    // Add success indicator to URL
    $separator = strpos($redirect, '?') !== false ? '&' : '?';
    $redirect .= $separator . 'oauth_login=success&provider=' . urlencode($provider);
    
    // Redirect to home or checkout
    header('Location: ' . $redirect, true, 302);
    exit;
    
} catch (Exception $e) {
    error_log("OAuth Error: " . $e->getMessage());
    
    // Redirect back to login with error
    header('Location: /index.html?login_error=' . urlencode('OAuth authentication failed: ' . $e->getMessage()), true, 302);
    exit;
}
?>
