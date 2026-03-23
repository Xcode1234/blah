-- Velvet Vogue E-Commerce Database Schema
-- Created: March 3, 2026

CREATE DATABASE IF NOT EXISTS velvetvogue_db;
USE velvetvogue_db;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    role ENUM('customer', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    gender VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    image_url VARCHAR(255),
    sku VARCHAR(100) UNIQUE,
    stock INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INT DEFAULT 0,
    badge VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_price (price),
    INDEX idx_gender (gender),
    FULLTEXT INDEX ft_search (name, description)
);

-- ============================================================================
-- PRODUCT VARIANTS TABLE (Sizes and Colors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    variant_sku VARCHAR(100),
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    UNIQUE KEY unique_variant (product_id, size, color)
);

-- ============================================================================
-- PRODUCT REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    subtotal DECIMAL(10, 2),
    tax DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2),
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- ============================================================================
-- USER ADDRESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    addresses_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- USER CARTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    cart_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- WISHLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist (user_id, product_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- COUPONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase DECIMAL(10, 2) DEFAULT 0,
    max_uses INT DEFAULT -1,
    current_uses INT DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_valid_until (valid_until)
);

-- ============================================================================
-- CONTACT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'resolved') DEFAULT 'new',
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- NEWSLETTER SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    INDEX idx_email (email)
);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- INSERT SAMPLE DATA
-- ============================================================================

-- Sample Products
INSERT INTO products (name, description, category, gender, price, original_price, sku, stock, rating, review_count, badge) VALUES
('Premium Cotton T-Shirt', 'High-quality cotton t-shirt perfect for everyday wear', 'casual', 'male', 45.00, 65.00, 'TSHIRT001', 50, 4.5, 23, 'Sale'),
('Elegant Formal Blazer', 'Professional blazer for formal occasions', 'formal', 'male', 189.00, NULL, 'BLAZER001', 15, 4.8, 12, NULL),
('Stylish Casual Jeans', 'Trendy jeans with modern fit and comfort', 'casual', 'female', 68.00, 85.00, 'JEANS001', 30, 4.6, 45, 'Sale'),
('Designer Dress', 'Elegant dress perfect for parties and formal events', 'formal', 'female', 135.00, NULL, 'DRESS001', 20, 4.7, 32, NULL),
('Comfortable Chino Pants', 'Versatile chino pants for casual and semi-formal wear', 'casual', 'male', 72.00, 92.00, 'CHINO001', 25, 4.4, 18, 'Sale'),
('Classic White Shirt', 'Timeless white shirt suitable for any occasion', 'formal', 'male', 58.00, NULL, 'SHIRT001', 40, 4.6, 28, NULL),
('Casual Hoodie', 'Comfortable hoodie perfect for relaxation', 'casual', 'unisex', 55.00, 75.00, 'HOODIE001', 35, 4.5, 34, 'Sale'),
('Leather Belt', 'Premium leather belt with elegant buckle', 'accessories', 'male', 42.00, 55.00, 'BELT001', 50, 4.7, 15, 'Sale'),
('Designer Handbag', 'Stylish handbag for daily use or special occasions', 'accessories', 'female', 165.00, NULL, 'BAG001', 18, 4.8, 52, NULL),
('Summer Shorts', 'Comfortable shorts perfect for summer', 'casual', 'male', 38.00, 52.00, 'SHORTS001', 45, 4.3, 22, 'Sale'),
('Silk Scarf', 'Elegant silk scarf to complement any outfit', 'accessories', 'female', 45.00, NULL, 'SCARF001', 30, 4.6, 19, NULL),
('Athletic Sneakers', 'Comfortable sneakers for sports and casual wear', 'accessories', 'unisex', 95.00, 125.00, 'SNEAK001', 28, 4.7, 41, 'Sale');

-- Sample Users (Admin and Customer)
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@velvetvogue.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWQm', 'John', 'Admin', 'admin'),
('customer@velvetvogue.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWQm', 'Jane', 'Customer', 'customer');

-- Sample Coupons
INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, is_active) VALUES
('VELVET25', 'percentage', 25, '2026-03-01', '2026-12-31', TRUE),
('STYLE20', 'percentage', 20, '2026-03-01', '2026-12-31', TRUE),
('WELCOME10', 'percentage', 10, '2026-03-01', '2026-12-31', TRUE),
('SAVE50', 'fixed', 50, '2026-03-01', '2026-06-30', TRUE);

-- ============================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for product information with stock
CREATE VIEW v_products_with_stock AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.gender,
    p.price,
    p.original_price,
    p.image_url,
    p.rating,
    p.review_count,
    p.is_active,
    SUM(COALESCE(pv.stock, 0)) as total_stock,
    COUNT(DISTINCT pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id;

-- View for order totals
CREATE VIEW v_order_summaries AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    o.status,
    o.payment_status,
    o.total,
    o.created_at,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_product_category_gender ON products(category, gender);
CREATE INDEX idx_product_price_rating ON products(price, rating);
CREATE INDEX idx_order_date_status ON orders(created_at, status);
CREATE INDEX idx_review_product_rating ON product_reviews(product_id, rating);

