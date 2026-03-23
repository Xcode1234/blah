<?php
/**
 * Database Migration - Add Passkeys Table
 * Run this file once to add passkeys support
 */

require_once __DIR__ . '/includes/config.php';

$db = Database::getInstance()->getConnection();

// Create passkeys table
$sql = "CREATE TABLE IF NOT EXISTS passkeys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    credential_id VARCHAR(512) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INT DEFAULT 0,
    device_name VARCHAR(255) DEFAULT 'Unknown Device',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_credential_id (credential_id)
)";

if ($db->query($sql)) {
    echo "✓ Passkeys table created successfully!\n";
} else {
    echo "✗ Error creating passkeys table: " . $db->error . "\n";
}

// Check if table was created
$result = $db->query("SHOW TABLES LIKE 'passkeys'");
if ($result->num_rows > 0) {
    echo "✓ Passkeys table exists and is ready to use\n";
    
    // Show table structure
    echo "\nTable structure:\n";
    $describe = $db->query("DESCRIBE passkeys");
    while ($row = $describe->fetch_assoc()) {
        echo "  - {$row['Field']} ({$row['Type']})\n";
    }
} else {
    echo "✗ Passkeys table was not created\n";
}
