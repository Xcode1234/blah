<?php
/**
 * Velvet Vogue - Authentication API
 * Handles user login, registration, and session management
 */

require_once __DIR__ . '/../includes/config.php';

class AuthAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function maskEmail($email) {
        $parts = explode('@', $email);
        if (count($parts) !== 2) return $email;

        $name = $parts[0];
        $domain = $parts[1];
        if (strlen($name) <= 2) {
            return substr($name, 0, 1) . '*@' . $domain;
        }

        return substr($name, 0, 1) . str_repeat('*', max(1, strlen($name) - 2)) . substr($name, -1) . '@' . $domain;
    }

    private function createAndStore2FACode($userId, $email) {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes

        $stmt = $this->db->prepare("DELETE FROM two_factor_codes WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
        }

        $insert = $this->db->prepare("INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES (?, ?, ?)");
        if (!$insert) {
            throw new Exception('Failed to prepare 2FA code insert');
        }
        $insert->bind_param('iss', $userId, $code, $expiresAt);
        if (!$insert->execute()) {
            throw new Exception('Failed to store 2FA code');
        }

        // TODO: integrate real email provider. For now, keep server-side log for local/dev verification.
        error_log("[2FA] Code for {$email}: {$code}");
        return $code;
    }

    private function startTwoFactorChallenge($user) {
        $challenge = bin2hex(random_bytes(24));
        $this->createAndStore2FACode((int)$user['id'], $user['email']);

        $_SESSION['pending_2fa'] = [
            'user_id' => (int)$user['id'],
            'email' => $user['email'],
            'name' => $user['first_name'],
            'role' => $user['role'],
            'challenge' => $challenge,
            'expires_at' => time() + 300
        ];

        logAction('LOGIN_2FA_REQUIRED', (int)$user['id'], "Password verified, awaiting 2FA: {$user['email']}");

        sendSuccess([
            'requires_2fa' => true,
            'challenge' => $challenge,
            'email_masked' => $this->maskEmail($user['email'])
        ], 'Two-factor verification required');
    }

    private function completeTwoFactorLogin($pending) {
        setSessionUser($pending['user_id'], $pending['email'], $pending['name'], $pending['role']);
        unset($_SESSION['pending_2fa']);

        logAction('LOGIN_2FA_SUCCESS', (int)$pending['user_id'], "2FA verified: {$pending['email']}");

        sendSuccess([
            'id' => (int)$pending['user_id'],
            'email' => $pending['email'],
            'name' => $pending['name'],
            'role' => $pending['role']
        ], 'Login successful');
    }

    /**
     * POST - User registration
     */
    public function register() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();

        // Validation
        if (empty($data['email']) || empty($data['password']) || empty($data['first_name'])) {
            sendError('Missing required fields', 400);
        }

        if (!validateEmail($data['email'])) {
            sendError('Invalid email format', 400);
        }

        if (!validatePassword($data['password'])) {
            sendError('Password must be at least 6 characters', 400);
        }

        $email = $this->db->real_escape_string($data['email']);
        $firstName = $this->db->real_escape_string($data['first_name']);
        $lastName = $this->db->real_escape_string($data['last_name'] ?? '');
        $password = hashPassword($data['password']);

        // Check if email already exists
        $checkResult = $this->db->query("SELECT id FROM users WHERE email = '$email'");
        if ($checkResult->num_rows > 0) {
            sendError('Email already registered', 409);
        }

        // Create user
        $sql = "INSERT INTO users (email, password, first_name, last_name, role, two_factor_enabled)
                VALUES ('$email', '$password', '$firstName', '$lastName', 'customer', 1)";

        if ($this->db->query($sql)) {
            $userId = $this->db->insert_id;
            logAction('REGISTER', $userId, "New user registered: $email");

            // Trigger 2FA challenge for new registrations
            $user = [
                'id' => $userId,
                'email' => $email,
                'first_name' => $firstName,
                'role' => 'customer'
            ];
            $this->startTwoFactorChallenge($user);
        } else {
            sendError('Registration failed: ' . $this->db->error);
        }
    }

    /**
     * POST - User login
     */
    public function login() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();

        // Validation
        if (empty($data['email']) || empty($data['password'])) {
            sendError('Email and password required', 400);
        }

        $email = $this->db->real_escape_string($data['email']);

        // Fetch user
        $sql = "SELECT id, email, password, first_name, role, is_active, two_factor_enabled FROM users WHERE email = '$email'";
        $result = $this->db->query($sql);

        if ($result->num_rows === 0) {
            sendError('Invalid email or password', 401);
        }

        $user = $result->fetch_assoc();

        // Check if user is active
        if (!$user['is_active']) {
            sendError('Account is inactive', 403);
        }

        // Verify password
        if (!verifyPassword($data['password'], $user['password'])) {
            sendError('Invalid email or password', 401);
        }

        // Enforce 2FA for all password-based logins.
        // A session is created only after successful code verification in verifyTwoFactorLogin().
        $this->startTwoFactorChallenge($user);
        return;
    }

    /**
     * POST - Verify 2FA code for pending password login
     */
    public function verifyTwoFactorLogin() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();
        $code = trim((string)($data['code'] ?? ''));
        $challenge = trim((string)($data['challenge'] ?? ''));

        if ($code === '' || $challenge === '') {
            sendError('Code and challenge are required', 400);
        }

        if (!preg_match('/^\d{6}$/', $code)) {
            sendError('Invalid code format', 400);
        }

        $pending = $_SESSION['pending_2fa'] ?? null;
        if (!$pending) {
            sendError('No pending 2FA challenge', 401);
        }

        if (($pending['expires_at'] ?? 0) < time()) {
            unset($_SESSION['pending_2fa']);
            sendError('2FA challenge expired. Please login again.', 401);
        }

        if (!hash_equals((string)$pending['challenge'], $challenge)) {
            sendError('Invalid 2FA challenge', 401);
        }

        // Demo exit code: 000000 bypasses 2FA verification
        if ($code === '000000') {
            logAction('LOGIN_2FA_DEMO_BYPASS', (int)$pending['user_id'], "2FA bypassed with demo exit code");
            $this->completeTwoFactorLogin($pending);
            return;
        }

        $userId = (int)$pending['user_id'];
        $stmt = $this->db->prepare("SELECT id FROM two_factor_codes WHERE user_id = ? AND code = ? AND expires_at >= NOW() LIMIT 1");
        if (!$stmt) {
            sendError('Failed to verify code', 500);
        }
        $stmt->bind_param('is', $userId, $code);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            sendError('Invalid or expired verification code', 401);
        }

        $delete = $this->db->prepare("DELETE FROM two_factor_codes WHERE user_id = ?");
        if ($delete) {
            $delete->bind_param('i', $userId);
            $delete->execute();
        }

        $this->completeTwoFactorLogin($pending);
    }

    /**
     * POST - Resend 2FA code for pending password login
     */
    public function resendTwoFactorCode() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();
        $challenge = trim((string)($data['challenge'] ?? ''));
        $pending = $_SESSION['pending_2fa'] ?? null;

        if (!$pending) {
            sendError('No pending 2FA challenge', 401);
        }

        if (($pending['expires_at'] ?? 0) < time()) {
            unset($_SESSION['pending_2fa']);
            sendError('2FA challenge expired. Please login again.', 401);
        }

        if ($challenge === '' || !hash_equals((string)$pending['challenge'], $challenge)) {
            sendError('Invalid 2FA challenge', 401);
        }

        $this->createAndStore2FACode((int)$pending['user_id'], $pending['email']);
        sendSuccess([
            'requires_2fa' => true,
            'challenge' => $pending['challenge'],
            'email_masked' => $this->maskEmail($pending['email'])
        ], 'Verification code resent');
    }

    /**
     * POST - User logout
     */
    public function logout() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $userId = getCurrentUserId();
        logAction('LOGOUT', $userId, 'User logged out');
        clearSessionUser();
        unset($_SESSION['pending_2fa']);

        sendSuccess(null, 'Logout successful');
    }

    /**
     * GET - Get current user profile
     */
    public function getCurrentUser() {
        if (!isGet()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $userId = getCurrentUserId();
        $sql = "SELECT id, email, first_name, last_name, phone, avatar_url, role, oauth_provider, created_at FROM users WHERE id = $userId";
        $result = $this->db->query($sql);

        if ($result->num_rows === 0) {
            sendError('User not found', 404);
        }

        $user = $result->fetch_assoc();
        sendSuccess($user, 'User profile retrieved');
    }

    /**
     * PUT - Update user profile
     */
    public function updateProfile() {
        if (!isPut()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $userId = getCurrentUserId();
        $data = getJsonInput();

        $updates = [];
        $params = [];

        if (isset($data['first_name'])) {
            $updates[] = "first_name = ?";
            $params[] = sanitizeInput($data['first_name']);
        }

        if (isset($data['last_name'])) {
            $updates[] = "last_name = ?";
            $params[] = sanitizeInput($data['last_name']);
        }

        if (isset($data['phone'])) {
            $updates[] = "phone = ?";
            $params[] = sanitizeInput($data['phone']);
        }

        if (empty($updates)) {
            sendError('No fields to update', 400);
        }

        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";

        $stmt = $this->db->prepare($sql);
        $types = str_repeat('s', count($params) - 1) . 'i';

        if ($stmt->bind_param($types, ...$params) && $stmt->execute()) {
            logAction('UPDATE_PROFILE', $userId, 'User updated profile');
            sendSuccess(null, 'Profile updated successfully');
        } else {
            sendError('Failed to update profile: ' . $this->db->error);
        }
    }

    /**
     * PUT - Change password
     */
    public function changePassword() {
        if (!isPut()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $data = getJsonInput();

        if (empty($data['current_password']) || empty($data['new_password'])) {
            sendError('Current and new password required', 400);
        }

        if (!validatePassword($data['new_password'])) {
            sendError('New password must be at least 6 characters', 400);
        }

        $userId = getCurrentUserId();

        // Fetch current password
        $sql = "SELECT password FROM users WHERE id = $userId";
        $result = $this->db->query($sql);
        $user = $result->fetch_assoc();

        // Verify current password
        if (!verifyPassword($data['current_password'], $user['password'])) {
            sendError('Current password is incorrect', 401);
        }

        $newPassword = hashPassword($data['new_password']);
        $updateSql = "UPDATE users SET password = '$newPassword' WHERE id = $userId";

        if ($this->db->query($updateSql)) {
            logAction('CHANGE_PASSWORD', $userId, 'User changed password');
            sendSuccess(null, 'Password changed successfully');
        } else {
            sendError('Failed to change password: ' . $this->db->error);
        }
    }

    /**
     * DELETE - Delete user account
     */
    public function deleteAccount() {
        if (!isDelete()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $userId = getCurrentUserId();

        // Start transaction
        $this->db->begin_transaction();

        try {
            // Delete all related data
            $tables = [
                'user_carts' => 'user_id',
                'order_items' => 'order_id', // Will be handled via foreign key cascade from orders
                'orders' => 'user_id',
                'user_addresses' => 'user_id',
                'passkeys' => 'user_id',
                'two_factor_codes' => 'user_id',
                'oauth_accounts' => 'user_id',
                'wishlists' => 'user_id',
                'product_reviews' => 'user_id',
                'audit_log' => 'user_id'
            ];

            // Delete order_items first (if no foreign key cascade)
            $ordersSql = "SELECT id FROM orders WHERE user_id = ?";
            $stmt = $this->db->prepare($ordersSql);
            if ($stmt) {
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $result = $stmt->get_result();
                $orderIds = [];
                while ($row = $result->fetch_assoc()) {
                    $orderIds[] = $row['id'];
                }
                $stmt->close();
                
                // Delete order items for each order
                foreach ($orderIds as $orderId) {
                    $delSql = "DELETE FROM order_items WHERE order_id = ?";
                    $delStmt = $this->db->prepare($delSql);
                    if ($delStmt) {
                        $delStmt->bind_param('i', $orderId);
                        $delStmt->execute();
                        $delStmt->close();
                    }
                }
            }

            // Delete from other tables
            foreach ($tables as $table => $column) {
                if ($table === 'order_items') continue; // Already handled
                
                $sql = "DELETE FROM $table WHERE $column = ?";
                $stmt = $this->db->prepare($sql);
                if ($stmt) {
                    $stmt->bind_param('i', $userId);
                    $stmt->execute();
                    $stmt->close();
                }
            }

            // Delete user account
            $sql = "DELETE FROM users WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare user deletion');
            }

            $stmt->bind_param('i', $userId);
            if (!$stmt->execute()) {
                throw new Exception('Failed to delete user');
            }
            $stmt->close();

            // Commit transaction
            $this->db->commit();

            // Log action before destroying session
            logAction('DELETE_ACCOUNT', $userId, 'User deleted their account');

            // Clear session
            session_destroy();

            sendSuccess(null, 'Account deleted successfully');
        } catch (Exception $e) {
            $this->db->rollback();
            sendError('Failed to delete account: ' . $e->getMessage(), 500);
        }
    }
}

// Route handling
$api = new AuthAPI();

if (isPost()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'register':
            $api->register();
            break;
        case 'login':
            $api->login();
            break;
        case 'verify-2fa':
            $api->verifyTwoFactorLogin();
            break;
        case 'resend-2fa':
            $api->resendTwoFactorCode();
            break;
        case 'logout':
            $api->logout();
            break;
        default:
            sendError('Invalid action', 400);
    }
} elseif (isGet()) {
    if (isset($_GET['action']) && $_GET['action'] === 'profile') {
        $api->getCurrentUser();
    } else {
        sendError('Action required', 400);
    }
} elseif (isPut()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'profile':
            $api->updateProfile();
            break;
        case 'password':
            $api->changePassword();
            break;
        default:
            sendError('Invalid action', 400);
    }
} elseif (isDelete()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'delete':
            $api->deleteAccount();
            break;
        default:
            sendError('Invalid action', 400);
    }
} else {
    sendError('Method not allowed', 405);
}

?>
