<?php
/**
 * Get OAuth Login URLs
 * Returns authorization URLs for Google and Apple
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/oauth-handler.php';

try {
    // Only POST allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendError('Method not allowed', 405);
    }
    
    $data = getJsonInput();
    $provider = $data['provider'] ?? null;
    
    if (!$provider || !in_array($provider, ['google', 'apple'])) {
        sendError('Invalid OAuth provider', 400);
    }
    
    // Store pending checkout if requested
    if ($data['pending_checkout'] ?? false) {
        $_SESSION['pending_checkout'] = true;
    }
    
    // Initialize OAuth handler
    $oauthHandler = new OAuthHandler(Database::getInstance()->getConnection());
    
    // Get authorization URL
    $authUrl = $oauthHandler->getAuthorizationURL($provider);
    
    sendSuccess([
        'auth_url' => $authUrl,
        'provider' => $provider
    ], 'OAuth URL generated');
    
} catch (Exception $e) {
    error_log("OAuth URL Error: " . $e->getMessage());
    sendError('Failed to generate OAuth URL: ' . $e->getMessage(), 500);
}
?>
