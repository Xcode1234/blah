<?php
/**
 * OAuth Handler
 * Manages OAuth login flows for Google and Apple
 */

require_once __DIR__ . '/oauth-config.php';

class OAuthHandler {
    private $db;
    
    public function __construct($pdo) {
        $this->db = $pdo;
    }
    
    /**
     * Generate OAuth authorization URL
     */
    public function getAuthorizationURL($provider) {
        if ($provider === 'google') {
            return $this->getGoogleAuthURL();
        } elseif ($provider === 'apple') {
            return $this->getAppleAuthURL();
        }
        throw new Exception('Unknown OAuth provider: ' . $provider);
    }
    
    private function getGoogleAuthURL() {
        $params = [
            'client_id' => GOOGLE_CLIENT_ID,
            'redirect_uri' => GOOGLE_REDIRECT_URI,
            'scope' => GOOGLE_SCOPES,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => bin2hex(random_bytes(16))
        ];
        
        // Store state in session
        $_SESSION['oauth_state_google'] = $params['state'];
        
        return GOOGLE_AUTH_URL . '?' . http_build_query($params);
    }
    
    private function getAppleAuthURL() {
        $params = [
            'client_id' => APPLE_BUNDLE_ID,
            'redirect_uri' => APPLE_REDIRECT_URI,
            'scope' => APPLE_SCOPES,
            'response_type' => 'code',
            'response_mode' => 'form_post',
            'state' => bin2hex(random_bytes(16))
        ];
        
        // Store state in session
        $_SESSION['oauth_state_apple'] = $params['state'];
        
        return APPLE_AUTH_URL . '?' . http_build_query($params);
    }
    
    /**
     * Handle OAuth callback
     */
    public function handleCallback($provider, $code, $state) {
        if ($provider === 'google') {
            return $this->handleGoogleCallback($code, $state);
        } elseif ($provider === 'apple') {
            return $this->handleAppleCallback($code, $state);
        }
        throw new Exception('Unknown OAuth provider: ' . $provider);
    }
    
    private function handleGoogleCallback($code, $state) {
        // Verify state
        if (empty($_SESSION['oauth_state_google']) || $state !== $_SESSION['oauth_state_google']) {
            throw new Exception('Invalid OAuth state');
        }
        unset($_SESSION['oauth_state_google']);
        
        // Exchange code for token
        $tokenData = $this->getGoogleToken($code);
        if (!$tokenData) {
            throw new Exception('Failed to get Google access token');
        }
        
        // Get user info
        $userInfo = $this->getGoogleUserInfo($tokenData['access_token']);
        if (!$userInfo) {
            throw new Exception('Failed to get Google user info');
        }
        
        // Find or create user
        return $this->findOrCreateOAuthUser('google', $userInfo);
    }
    
    private function handleAppleCallback($code, $state) {
        // Verify state
        if (empty($_SESSION['oauth_state_apple']) || $state !== $_SESSION['oauth_state_apple']) {
            throw new Exception('Invalid OAuth state');
        }
        unset($_SESSION['oauth_state_apple']);
        
        // Exchange code for token
        $tokenData = $this->getAppleToken($code);
        if (!$tokenData) {
            throw new Exception('Failed to get Apple access token');
        }
        
        // Decode ID token (Apple doesn't provide user endpoint, claims are in ID token)
        $userInfo = $this->decodeAppleIdToken($tokenData['id_token']);
        if (!$userInfo) {
            throw new Exception('Failed to decode Apple ID token');
        }
        
        // Find or create user
        return $this->findOrCreateOAuthUser('apple', $userInfo);
    }
    
    private function getGoogleToken($code) {
        $params = [
            'code' => $code,
            'client_id' => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri' => GOOGLE_REDIRECT_URI,
            'grant_type' => 'authorization_code'
        ];
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($params),
                'timeout' => 10
            ]
        ]);
        
        $response = @file_get_contents(GOOGLE_TOKEN_URL, false, $context);
        return $response ? json_decode($response, true) : null;
    }
    
    private function getGoogleUserInfo($accessToken) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "Authorization: Bearer $accessToken\r\n",
                'timeout' => 10
            ]
        ]);
        
        $response = @file_get_contents(GOOGLE_USERINFO_URL, false, $context);
        return $response ? json_decode($response, true) : null;
    }
    
    private function getAppleToken($code) {
        $clientSecret = $this->generateAppleClientSecret();
        
        $params = [
            'code' => $code,
            'client_id' => APPLE_BUNDLE_ID,
            'client_secret' => $clientSecret,
            'redirect_uri' => APPLE_REDIRECT_URI,
            'grant_type' => 'authorization_code'
        ];
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($params),
                'timeout' => 10
            ]
        ]);
        
        $response = @file_get_contents(APPLE_TOKEN_URL, false, $context);
        return $response ? json_decode($response, true) : null;
    }
    
    private function decodeAppleIdToken($idToken) {
        // Decode JWT (simplified - in production should validate signature)
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            return null;
        }
        
        // Decode payload
        $payload = json_decode(base64_decode($parts[1]), true);
        
        return [
            'id' => $payload['sub'] ?? null,
            'email' => $payload['email'] ?? null,
            'name' => $payload['name'] ?? 'Apple User'
        ];
    }
    
    private function generateAppleClientSecret() {
        // Generate JWT signed with Apple's private key
        // This is a placeholder - full implementation requires file_get_contents on private key
        
        $header = [
            'alg' => 'ES256',
            'kid' => APPLE_KEY_ID,
            'typ' => 'JWT'
        ];
        
        $payload = [
            'iss' => APPLE_TEAM_ID,
            'aud' => 'https://appleid.apple.com',
            'sub' => APPLE_BUNDLE_ID,
            'iat' => time(),
            'exp' => time() + 3600
        ];
        
        // Simplified - in production, use proper JWT library
        return base64_encode(json_encode($header)) . '.' . base64_encode(json_encode($payload)) . '.signature';
    }
    
    /**
     * Find or create user from OAuth provider
     */
    private function findOrCreateOAuthUser($provider, $userInfo) {
        $providerId = (string)($userInfo['id'] ?? $userInfo['sub'] ?? null);
        $email = $userInfo['email'] ?? null;
        $name = $userInfo['name'] ?? 'User';
        
        if (!$providerId) {
            throw new Exception('OAuth provider did not return a user ID');
        }
        
        // Try to find existing OAuth account
        $stmt = $this->db->prepare(
            "SELECT u.* FROM users u 
             JOIN oauth_accounts oa ON u.id = oa.user_id 
             WHERE oa.provider = ? AND oa.provider_id = ?"
        );
        $stmt->bind_param('ss', $provider, $providerId);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        
        if ($user) {
            // Update last login and tokens
            $this->updateOAuthAccount($user['id'], $provider, $providerId, $userInfo);
            return $user;
        }
        
        // Try to find by email if email provided
        if ($email) {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if ($user) {
                // Link existing account to OAuth provider
                $this->linkOAuthAccount($user['id'], $provider, $providerId, $userInfo);
                return $user;
            }
        }
        
        // Create new user
        return $this->createOAuthUser($provider, $providerId, $email, $name, $userInfo);
    }
    
    private function updateOAuthAccount($userId, $provider, $providerId, $userInfo) {
        $stmt = $this->db->prepare(
            "UPDATE oauth_accounts SET updated_at = NOW() 
             WHERE user_id = ? AND provider = ?"
        );
        $stmt->bind_param('is', $userId, $provider);
        $stmt->execute();
    }
    
    private function linkOAuthAccount($userId, $provider, $providerId, $userInfo) {
        $stmt = $this->db->prepare(
            "INSERT INTO oauth_accounts (user_id, provider, provider_id, created_at) 
             VALUES (?, ?, ?, NOW())"
        );
        $stmt->bind_param('iss', $userId, $provider, $providerId);
        $stmt->execute();
    }
    
    private function createOAuthUser($provider, $providerId, $email, $name, $userInfo) {
        // Generate a random password for OAuth users
        $password = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        
        // Parse name
        $nameParts = explode(' ', $name, 2);
        $firstName = $nameParts[0] ?? 'User';
        $lastName = $nameParts[1] ?? '';
        
        // Ensure email is unique
        if ($email) {
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                // Email exists, generate unique email
                $email = $provider . '_' . $providerId . '@oauth.velvetvogue.local';
            }
        } else {
            // No email from provider, generate one
            $email = $provider . '_' . $providerId . '@oauth.velvetvogue.local';
        }
        
        // Create user
        $stmt = $this->db->prepare(
            "INSERT INTO users (email, password, first_name, last_name, oauth_provider, oauth_id, two_factor_enabled) 
             VALUES (?, ?, ?, ?, ?, ?, 0)"
        );
        $stmt->bind_param('ssssss', $email, $password, $firstName, $lastName, $provider, $providerId);
        $stmt->execute();
        
        $userId = $this->db->insert_id;
        
        // Link OAuth account
        $this->linkOAuthAccount($userId, $provider, $providerId, $userInfo);
        
        // Fetch and return user
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
}
?>
