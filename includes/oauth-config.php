<?php
/**
 * OAuth Configuration
 * Configure your OAuth provider credentials here
 */

// Google OAuth Configuration
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '312153864980-fi7j34acs6ck11i2slvmnhm4vb742gm9.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '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');
define('GOOGLE_REDIRECT_URI', getenv('GOOGLE_REDIRECT_URI') ?: 'https://dev.velvetvogue.net:8443/api/oauth-callback.php?provider=google');

// Apple OAuth Configuration
define('APPLE_TEAM_ID', getenv('APPLE_TEAM_ID') ?: 'YOUR_APPLE_TEAM_ID_HERE');
define('APPLE_KEY_ID', getenv('APPLE_KEY_ID') ?: 'YOUR_APPLE_KEY_ID_HERE');
define('APPLE_BUNDLE_ID', getenv('APPLE_BUNDLE_ID') ?: 'com.velvetvogue.app');
define('APPLE_PRIVATE_KEY_PATH', getenv('APPLE_PRIVATE_KEY_PATH') ?: __DIR__ . '/../keys/apple_private_key.p8');
define('APPLE_REDIRECT_URI', getenv('APPLE_REDIRECT_URI') ?: 'http://localhost:8000/api/oauth-callback.php?provider=apple');

// OAuth scopes
define('GOOGLE_SCOPES', 'openid profile email');
define('APPLE_SCOPES', 'openid profile email');

// OAuth endpoints
define('GOOGLE_AUTH_URL', 'https://accounts.google.com/o/oauth2/v2/auth');
define('GOOGLE_TOKEN_URL', 'https://oauth2.googleapis.com/token');
define('GOOGLE_USERINFO_URL', 'https://www.googleapis.com/oauth2/v2/userinfo');

define('APPLE_AUTH_URL', 'https://appleid.apple.com/auth/authorize');
define('APPLE_TOKEN_URL', 'https://appleid.apple.com/auth/token');

/**
 * Validate OAuth configuration
 */
function validateOAuthConfig() {
    $errors = [];
    
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        $errors[] = 'Google OAuth not configured (GOOGLE_CLIENT_ID)';
    }
    
    if (APPLE_TEAM_ID === 'YOUR_APPLE_TEAM_ID_HERE') {
        $errors[] = 'Apple OAuth not configured (APPLE_TEAM_ID)';
    }
    
    return $errors;
}
?>
