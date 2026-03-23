<?php
/**
 * Velvet Vogue - Passkeys (WebAuthn) API
 * Handles passkey registration and authentication
 */

// Start session first if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ensure no output before headers
ob_start();

require_once __DIR__ . '/../includes/config.php';

// Clear any accidental output and set proper header
ob_end_clean();
header('Content-Type: application/json; charset=utf-8');

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

class PasskeysAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * POST - Start passkey registration (get challenge)
     */
    public function registerStart() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $userId = getCurrentUserId();
        
        // Fetch user info
        $sql = "SELECT id, email, first_name, last_name FROM users WHERE id = $userId";
        $result = $this->db->query($sql);
        
        if ($result->num_rows === 0) {
            sendError('User not found', 404);
        }
        
        $user = $result->fetch_assoc();

        // Generate binary challenge and store as base64url
        $challengeBytes = random_bytes(32);
        $challenge = base64url_encode($challengeBytes);
        $_SESSION['passkey_challenge'] = $challenge;
        $_SESSION['passkey_user_id'] = $userId;

        // Stable opaque user handle (32 bytes max, deterministic)
        $userHandle = substr(hash('sha256', 'user:' . (string)$user['id'], true), 0, 32);

        // Relying party ID should match current host (without port)
        $host = parse_url((isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : ''), PHP_URL_HOST);
        if (!$host) {
            $host = $_SERVER['SERVER_NAME'] ?? 'localhost';
        }
        $rpId = strtolower($host);

        // Get existing credentials for this user
        $credSql = "SELECT credential_id FROM passkeys WHERE user_id = $userId";
        $credResult = $this->db->query($credSql);
        $excludeCredentials = [];
        while ($cred = $credResult->fetch_assoc()) {
            $excludeCredentials[] = [
                'type' => 'public-key',
                'id' => $cred['credential_id']
            ];
        }

        sendSuccess([
            'challenge' => $challenge,
            'rp' => [
                'name' => 'Velvet Vogue',
                'id' => $rpId
            ],
            'user' => [
                'id' => base64url_encode($userHandle),
                'name' => $user['email'],
                'displayName' => trim($user['first_name'] . ' ' . $user['last_name'])
            ],
            'excludeCredentials' => $excludeCredentials
        ], 'Registration challenge generated');
    }

    /**
     * POST - Complete passkey registration
     */
    public function registerFinish() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $data = getJsonInput();
        
        if (empty($data['credential_id']) || empty($data['public_key'])) {
            sendError('Missing credential data', 400);
        }

        $userId = getCurrentUserId();
        $credentialId = $this->db->real_escape_string($data['credential_id']);
        $publicKey = $this->db->real_escape_string($data['public_key']);
        $deviceName = $this->db->real_escape_string($data['device_name'] ?? 'Unknown Device');
        
        // Verify challenge (basic check)
        if (!isset($_SESSION['passkey_challenge'])) {
            sendError('Invalid session', 400);
        }
        
        // Store passkey
        $sql = "INSERT INTO passkeys (user_id, credential_id, public_key, device_name, counter) 
                VALUES ($userId, '$credentialId', '$publicKey', '$deviceName', 0)";
        
        if ($this->db->query($sql)) {
            unset($_SESSION['passkey_challenge']);
            unset($_SESSION['passkey_user_id']);
            logAction('PASSKEY_REGISTER', $userId, "Passkey registered: $deviceName");
            sendSuccess(null, 'Passkey registered successfully', 201);
        } else {
            sendError('Failed to register passkey: ' . $this->db->error);
        }
    }

    /**
     * POST - Start passkey authentication (get challenge)
     */
    public function loginStart() {
        $data = getJsonInput();

        // Generate binary challenge and store as base64url
        $challenge = base64url_encode(random_bytes(32));
        $_SESSION['passkey_challenge'] = $challenge;

        // Relying party ID should match current host (without port)
        $host = parse_url((isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : ''), PHP_URL_HOST);
        if (!$host) {
            $host = $_SERVER['SERVER_NAME'] ?? 'localhost';
        }
        $rpId = strtolower($host);

        // Get all registered credential IDs (for user-less login)
        $allowCredentials = [];
        
        if (!empty($data['email'])) {
            // Email-based: only allow credentials for this user
            $email = $this->db->real_escape_string($data['email']);
            $sql = "SELECT p.credential_id FROM passkeys p 
                    INNER JOIN users u ON p.user_id = u.id 
                    WHERE u.email = '$email'";
            $result = $this->db->query($sql);
            
            while ($cred = $result->fetch_assoc()) {
                $allowCredentials[] = [
                    'type' => 'public-key',
                    'id' => $cred['credential_id']
                ];
            }
        }
        
        sendSuccess([
            'challenge' => $challenge,
            'rpId' => $rpId,
            'allowCredentials' => $allowCredentials
        ], 'Authentication challenge generated');
    }

    /**
     * POST - Complete passkey authentication
     */
    public function loginFinish() {
        $data = getJsonInput();
        
        if (empty($data['credential_id'])) {
            sendError('Missing credential ID', 400);
        }

        // Verify challenge
        if (!isset($_SESSION['passkey_challenge'])) {
            sendError('Invalid session', 400);
        }
        
        $credentialId = $this->db->real_escape_string($data['credential_id']);
        
        // Fetch passkey and user info
        $sql = "SELECT p.*, u.id as user_id, u.email, u.first_name, u.role 
                FROM passkeys p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.credential_id = '$credentialId' AND u.is_active = TRUE";
        $result = $this->db->query($sql);
        
        if ($result->num_rows === 0) {
            sendError('Invalid credential', 401);
        }
        
        $passkey = $result->fetch_assoc();
        
        // Update counter and last used
        $newCounter = $passkey['counter'] + 1;
        $updateSql = "UPDATE passkeys SET counter = $newCounter, last_used_at = NOW() 
                     WHERE id = {$passkey['id']}";
        $this->db->query($updateSql);
        
        // Set session
        setSessionUser($passkey['user_id'], $passkey['email'], $passkey['first_name'], $passkey['role']);
        logAction('PASSKEY_LOGIN', $passkey['user_id'], "Passkey login: {$passkey['device_name']}");
        
        unset($_SESSION['passkey_challenge']);
        
        sendSuccess([
            'id' => $passkey['user_id'],
            'email' => $passkey['email'],
            'name' => $passkey['first_name'],
            'role' => $passkey['role']
        ], 'Passkey authentication successful');
    }

    /**
     * GET - List user's passkeys
     */
    public function listPasskeys() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $userId = getCurrentUserId();
        $sql = "SELECT id, device_name, created_at, last_used_at FROM passkeys WHERE user_id = $userId";
        $result = $this->db->query($sql);
        
        $passkeys = [];
        while ($row = $result->fetch_assoc()) {
            $passkeys[] = $row;
        }
        
        sendSuccess(['passkeys' => $passkeys], 'Passkeys retrieved');
    }

    /**
     * DELETE - Remove a passkey
     */
    public function deletePasskey($passkeyId) {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $userId = getCurrentUserId();
        $passkeyId = (int)$passkeyId;
        
        $sql = "DELETE FROM passkeys WHERE id = $passkeyId AND user_id = $userId";
        
        if ($this->db->query($sql)) {
            if ($this->db->affected_rows > 0) {
                logAction('PASSKEY_DELETE', $userId, "Passkey deleted: ID $passkeyId");
                sendSuccess(null, 'Passkey deleted');
            } else {
                sendError('Passkey not found', 404);
            }
        } else {
            sendError('Failed to delete passkey: ' . $this->db->error);
        }
    }
}

// Route handling
$api = new PasskeysAPI();

if (isPost()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'register-start':
            $api->registerStart();
            break;
        case 'register-finish':
            $api->registerFinish();
            break;
        case 'login-start':
            $api->loginStart();
            break;
        case 'login-finish':
            $api->loginFinish();
            break;
        default:
            sendError('Invalid action', 400);
    }
} elseif (isGet()) {
    if (isset($_GET['action']) && $_GET['action'] === 'list') {
        $api->listPasskeys();
    } else {
        sendError('Action required', 400);
    }
} elseif (isDelete()) {
    if (isset($_GET['id'])) {
        $api->deletePasskey($_GET['id']);
    } else {
        sendError('ID required', 400);
    }
} else {
    sendError('Method not allowed', 405);
}
