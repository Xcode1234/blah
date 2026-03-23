-- Passkeys (WebAuthn) Extension for Velvet Vogue
-- Add this to your existing database

USE velvetvogue_db;

-- ============================================================================
-- PASSKEYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS passkeys (
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
);
