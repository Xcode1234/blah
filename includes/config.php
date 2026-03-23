<?php
/**
 * Velvet Vogue - Database Configuration
 * Handles database connection and common utilities
 *
 * NOTE: this application expects either the mysqli or pdo_mysql PHP
 * extension to be enabled.  If you see "Class \"mysqli\" not found" errors
 * in the log/terminal, install/enable php-mysqli (or php-pdo-mysql) and
 * restart your PHP server:
 *
 *   sudo apt install php-mysqli        # Debian/Ubuntu
 *   sudo service php-fpm restart       # or appropriate restart command
 *
 * Without a database driver the API will return an error message instead
 * of crashing.
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'velvetvogue');
define('DB_PASS', 'velvet_app_pass_2026');
define('DB_NAME', 'velvetvogue_db');

// Application Settings
define('APP_NAME', 'Velvet Vogue');
define('APP_URL', 'http://localhost');
define('API_KEY_REQUIRED', false);

// CORS Headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost:8000';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Set JSON response header
header('Content-Type: application/json');

// Error Reporting
error_reporting(E_ALL);
ini_set('display_errors', false);
ini_set('log_errors', true);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Create logs directory if it doesn't exist
if (!is_dir(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0777, true);
}

/**
 * Database Connection Class
 */
class Database {
    private $connection;
    private static $instance;

    private function __construct() {
        // Attempt to establish a connection using the available MySQL driver.
        // In some PHP environments the mysqli extension may not be enabled (as
        // seen in the terminal errors).  We try mysqli first and fall back to
        // PDO if necessary, issuing a clear message if neither is available.
        if (class_exists('mysqli')) {
            try {
                $this->connection = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
                if ($this->connection->connect_error) {
                    throw new Exception("Database connection failed: " . $this->connection->connect_error);
                }
                $this->connection->set_charset("utf8mb4");
            } catch (Exception $e) {
                error_log($e->getMessage());
                die(json_encode(['success' => false, 'message' => 'Database connection error']));
            }
        } elseif (class_exists('PDO')) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $opts = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ];
                $this->connection = new PDO($dsn, DB_USER, DB_PASS, $opts);
            } catch (PDOException $e) {
                error_log($e->getMessage());
                die(json_encode(['success' => false, 'message' => 'Database connection error']));
            }
        } else {
            die(json_encode(['success' => false, 'message' => 'Neither mysqli nor PDO extensions are available. Please enable php-mysqli or php-pdo_mysql.']));
        }
    }

    public static function getInstance() {
        if (!isset(self::$instance)) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql) {
        return $this->connection->query($sql);
    }

    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }

    public function escape($string) {
        return $this->connection->real_escape_string($string);
    }

    public function close() {
        $this->connection->close();
    }

    public function lastInsertId() {
        return $this->connection->insert_id;
    }

    public function affectedRows() {
        return $this->connection->affected_rows;
    }

    public function error() {
        return $this->connection->error;
    }
}

/**
 * Response Helper Functions
 */
function sendResponse($success = true, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

function sendError($message = 'An error occurred', $statusCode = 400) {
    sendResponse(false, null, $message, $statusCode);
}

function sendSuccess($data = null, $message = 'Success', $statusCode = 200) {
    sendResponse(true, $data, $message, $statusCode);
}

/**
 * Session Management
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Restore session from OAuth cookies if session is empty but cookies exist
if (empty($_SESSION['user_id']) && !empty($_COOKIE['user_id']) && !empty($_COOKIE['user_email'])) {
    $_SESSION['user_id'] = (int)$_COOKIE['user_id'];
    $_SESSION['email'] = $_COOKIE['user_email'];
    $_SESSION['name'] = $_COOKIE['user_name'] ?? '';
    $_SESSION['role'] = 'customer';
    $_SESSION['oauth_provider'] = $_COOKIE['oauth_provider'] ?? null;
    $_SESSION['login_time'] = time();
}

function setSessionUser($userId, $email, $name, $role = 'customer') {
    $_SESSION['user_id'] = $userId;
    $_SESSION['email'] = $email;
    $_SESSION['name'] = $name;
    $_SESSION['role'] = $role;
    $_SESSION['login_time'] = time();
}

function clearSessionUser() {
    unset($_SESSION['user_id']);
    unset($_SESSION['email']);
    unset($_SESSION['name']);
    unset($_SESSION['role']);
    unset($_SESSION['login_time']);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

function getCurrentUserRole() {
    return $_SESSION['role'] ?? 'guest';
}

/**
 * Validation Functions
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validatePassword($password) {
    return strlen($password) >= 6;
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * File Upload Helper
 */
function handleFileUpload($file, $uploadDir = '../assets/images/') {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'File upload failed'];
    }

    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        return ['success' => false, 'message' => 'Invalid file type'];
    }

    if ($file['size'] > 5 * 1024 * 1024) { // 5MB limit
        return ['success' => false, 'message' => 'File too large'];
    }

    $filename = uniqid() . '_' . basename($file['name']);
    $filepath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        return ['success' => true, 'filename' => $filename, 'path' => $filepath];
    }

    return ['success' => false, 'message' => 'Failed to move uploaded file'];
}

/**
 * Request Method Helpers
 */
function isPost() {
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

function isGet() {
    return $_SERVER['REQUEST_METHOD'] === 'GET';
}

function isPut() {
    return $_SERVER['REQUEST_METHOD'] === 'PUT';
}

function isDelete() {
    return $_SERVER['REQUEST_METHOD'] === 'DELETE';
}

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function getPostData() {
    if (isPost()) {
        return $_POST;
    }
    return getJsonInput();
}

/**
 * Logging
 */
function logAction($action, $userId = null, $details = '') {
    $logFile = __DIR__ . '/../logs/activity.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] User: {$userId} | Action: {$action} | Details: {$details}\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

?>
