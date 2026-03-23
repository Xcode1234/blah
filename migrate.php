<?php
/**
 * Database Migration Script
 * Run this script to apply all pending migrations
 */

require_once __DIR__ . '/api/db.php';

// ANSI color codes for terminal output
define('COLOR_GREEN', "\033[32m");
define('COLOR_RED', "\033[31m");
define('COLOR_YELLOW', "\033[33m");
define('COLOR_BLUE', "\033[34m");
define('COLOR_RESET', "\033[0m");

function printSuccess($message) {
    echo COLOR_GREEN . "✓ " . $message . COLOR_RESET . "\n";
}

function printError($message) {
    echo COLOR_RED . "✗ " . $message . COLOR_RESET . "\n";
}

function printInfo($message) {
    echo COLOR_BLUE . "ℹ " . $message . COLOR_RESET . "\n";
}

function printWarning($message) {
    echo COLOR_YELLOW . "⚠ " . $message . COLOR_RESET . "\n";
}

// Create migrations table if it doesn't exist
function createMigrationsTable($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        return true;
    } catch (PDOException $e) {
        printError("Failed to create migrations table: " . $e->getMessage());
        return false;
    }
}

// Check if migration has been run
function isMigrationExecuted($pdo, $migrationName) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM migrations WHERE migration = ?");
        $stmt->execute([$migrationName]);
        return $stmt->fetchColumn() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

// Record executed migration
function recordMigration($pdo, $migrationName) {
    try {
        $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$migrationName]);
        return true;
    } catch (PDOException $e) {
        printError("Failed to record migration: " . $e->getMessage());
        return false;
    }
}

// Migration: Add 2FA support
function migration_add_2fa_support($pdo) {
    $migrationName = 'add_2fa_support';
    
    if (isMigrationExecuted($pdo, $migrationName)) {
        printInfo("Migration '$migrationName' already executed, skipping...");
        return true;
    }
    
    printInfo("Running migration: $migrationName");
    
    try {
        // Check if column already exists
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'two_factor_enabled'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0");
            printSuccess("Added two_factor_enabled column to users table");
        } else {
            printInfo("Column two_factor_enabled already exists in users table");
        }
        
        // Create two_factor_codes table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS two_factor_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
        ");
        printSuccess("Created two_factor_codes table");
        
        // Record this migration
        if (recordMigration($pdo, $migrationName)) {
            printSuccess("Migration '$migrationName' completed successfully");
            return true;
        }
        
        return false;
        
    } catch (PDOException $e) {
        printError("Migration '$migrationName' failed: " . $e->getMessage());
        return false;
    }
}

// Migration: Add OAuth support
function migration_add_oauth_support($pdo) {
    $migrationName = 'add_oauth_support';
    
    if (isMigrationExecuted($pdo, $migrationName)) {
        printInfo("Migration '$migrationName' already executed, skipping...");
        return true;
    }
    
    printInfo("Running migration: $migrationName");
    
    try {
        // Add OAuth columns to users table
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'oauth_provider'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50) NULL DEFAULT NULL");
            printSuccess("Added oauth_provider column to users table");
        }
        
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'oauth_id'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255) NULL DEFAULT NULL");
            printSuccess("Added oauth_id column to users table");
        }
        
        // Create unique index on oauth combination
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                provider VARCHAR(50) NOT NULL,
                provider_id VARCHAR(255) NOT NULL,
                access_token TEXT,
                refresh_token TEXT,
                expires_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE INDEX unique_provider_id (provider, provider_id),
                INDEX idx_user_id (user_id)
            )
        ");
        printSuccess("Created oauth_accounts table");
        
        // Record this migration
        if (recordMigration($pdo, $migrationName)) {
            printSuccess("Migration '$migrationName' completed successfully");
            return true;
        }
        
        return false;
        
    } catch (PDOException $e) {
        printError("Migration '$migrationName' failed: " . $e->getMessage());
        return false;
    }
}

// Main execution
function main() {
    global $pdo;
    
    echo "\n";
    printInfo("=== Velvet Vogue Database Migration ===");
    echo "\n";
    
    // Create migrations tracking table
    if (!createMigrationsTable($pdo)) {
        printError("Failed to initialize migration system");
        exit(1);
    }
    
    printSuccess("Migration system initialized");
    echo "\n";
    
    // List of all migrations to run
    $migrations = [
        'migration_add_2fa_support',
        'migration_add_oauth_support'
    ];
    
    $successCount = 0;
    $failCount = 0;
    $skipCount = 0;
    
    foreach ($migrations as $migration) {
        if (function_exists($migration)) {
            $result = $migration($pdo);
            if ($result === true) {
                $successCount++;
            } elseif ($result === false) {
                $failCount++;
            } else {
                $skipCount++;
            }
            echo "\n";
        } else {
            printWarning("Migration function '$migration' not found");
            $failCount++;
            echo "\n";
        }
    }
    
    // Summary
    printInfo("=== Migration Summary ===");
    printSuccess("Successful: $successCount");
    if ($skipCount > 0) {
        printInfo("Skipped: $skipCount");
    }
    if ($failCount > 0) {
        printError("Failed: $failCount");
        exit(1);
    }
    
    echo "\n";
    printSuccess("All migrations completed successfully!");
    echo "\n";
}

// Run migrations
try {
    main();
} catch (Exception $e) {
    printError("Fatal error: " . $e->getMessage());
    exit(1);
}
?>