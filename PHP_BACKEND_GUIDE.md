# Velvet Vogue - PHP Backend Integration Guide

## 📋 Overview

The Velvet Vogue e-commerce platform now includes a complete PHP backend with MySQL database support. This guide covers setup, API endpoints, and integration instructions.

---

## 🚀 Quick Start

### Prerequisites

- **PHP 7.4+** (recommend PHP 8.0+)
- **MySQL 5.7+** or **MariaDB 10.3+**
- **Apache** with `mod_rewrite` enabled
- **Composer** (optional, for dependency management)

### Installation Steps

#### 1. Database Setup

```bash
# Connect to MySQL
mysql -u root -p

# Execute the database schema
SOURCE /path/to/velvetvogue/database.sql;

# Verify tables were created
SHOW TABLES;
```

#### 2. Configure Database Connection

Edit `includes/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
define('DB_NAME', 'velvetvogue_db');
```

#### 3. Set File Permissions

```bash
# Make logs directory writable
chmod 755 /path/to/velvetvogue
chmod 777 /path/to/velvetvogue/logs
chmod 777 /path/to/velvetvogue/assets/images
```

#### 4. Enable .htaccess Rewriting

Apache configuration in `httpd.conf` or `.htaccess`:

```apache
<Directory /var/www/velvetvogue>
    AllowOverride All
</Directory>
```

#### 5. Start PHP Server

**Option 1: Built-in PHP Server**
```bash
cd /path/to/velvetvogue
php -S localhost:8000
# Access at http://localhost:8000
```

**Option 2: Apache Virtual Host**
```apache
<VirtualHost *:80>
    ServerName velvetvogue.local
    DocumentRoot /var/www/velvetvogue
    
    <Directory /var/www/velvetvogue>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:8000/api/
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth.php?action=register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepass123",
    "first_name": "John",
    "last_name": "Doe"
}

Response:
{
    "success": true,
    "data": {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "role": "customer"
    },
    "message": "Registration successful"
}
```

#### Login User
```http
POST /api/auth.php?action=login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepass123"
}

Response:
{
    "success": true,
    "data": {
        "id": 1,
        "email": "user@example.com",
        "name": "John",
        "role": "customer"
    },
    "message": "Login successful"
}
```

#### Logout User
```http
POST /api/auth.php?action=logout
Content-Type: application/json

Response:
{
    "success": true,
    "message": "Logout successful"
}
```

#### Get Current User
```http
GET /api/auth.php?action=profile
Authorization: Bearer <session_token>

Response:
{
    "success": true,
    "data": {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "123-456-7890",
        "role": "customer"
    },
    "message": "User profile retrieved"
}
```

#### Update Profile
```http
PUT /api/auth.php?action=profile
Content-Type: application/json

{
    "first_name": "John",
    "last_name": "Doe",
    "phone": "123-456-7890"
}
```

#### Change Password
```http
PUT /api/auth.php?action=password
Content-Type: application/json

{
    "current_password": "oldpass123",
    "new_password": "newpass123"
}
```

---

### Product Endpoints

#### Get All Products
```http
GET /api/products.php?category=casual&gender=male&minPrice=0&maxPrice=100&sortBy=newest&page=1
Content-Type: application/json

Response:
{
    "success": true,
    "data": {
        "products": [
            {
                "id": 1,
                "name": "Product Name",
                "category": "casual",
                "price": 45.00,
                "rating": 4.5,
                "sizes": ["XS", "S", "M", "L"],
                "colors": ["Black", "White"]
            }
        ],
        "pagination": {
            "currentPage": 1,
            "perPage": 12,
            "total": 50,
            "pages": 5
        }
    },
    "message": "Products retrieved successfully"
}
```

#### Get Single Product
```http
GET /api/products.php?id=1
Content-Type: application/json

Response:
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Premium Cotton T-Shirt",
        "description": "High-quality cotton...",
        "price": 45.00,
        "original_price": 65.00,
        "sizes": ["XS", "S", "M", "L"],
        "colors": ["Black", "White", "Blue"],
        "reviews": [
            {
                "id": 1,
                "rating": 5,
                "review_text": "Great product!",
                "first_name": "John",
                "created_at": "2026-03-01"
            }
        ]
    }
}
```

#### Create Product (Admin)
```http
POST /api/products.php
Content-Type: application/json
Authorization: Bearer <admin_token>

{
    "name": "New Product",
    "description": "Product description",
    "category": "casual",
    "gender": "male",
    "price": 45.00,
    "original_price": 65.00,
    "sku": "PROD001",
    "stock": 50,
    "image_url": "filename.jpg",
    "variants": [
        {
            "size": "M",
            "color": "Black",
            "stock": 10
        }
    ]
}

Response:
{
    "success": true,
    "data": {
        "id": 13
    },
    "message": "Product created successfully"
}
```

#### Update Product (Admin)
```http
PUT /api/products.php?id=1
Content-Type: application/json

{
    "name": "Updated Name",
    "price": 50.00,
    "stock": 30
}
```

#### Delete Product (Admin)
```http
DELETE /api/products.php?id=1
```

---

### Shopping Cart & Orders

#### Apply Coupon
```http
POST /api/cart.php?action=apply-coupon
Content-Type: application/json

{
    "code": "VELVET25",
    "subtotal": 100.00
}

Response:
{
    "success": true,
    "data": {
        "code": "VELVET25",
        "discount_type": "percentage",
        "discount_value": 25,
        "discount_amount": 25.00,
        "new_total": 75.00
    },
    "message": "Coupon applied successfully"
}
```

#### Create Order
```http
POST /api/cart.php?action=create-order
Content-Type: application/json

{
    "items": [
        {
            "product_id": 1,
            "quantity": 2,
            "price": 45.00,
            "size": "M",
            "color": "Black"
        }
    ],
    "subtotal": 90.00,
    "tax": 9.00,
    "shipping": 10.00,
    "discount": 0,
    "total": 109.00,
    "payment_method": "credit_card",
    "shipping_address": "123 Main St, City, State 12345",
    "notes": "Please gift wrap"
}

Response:
{
    "success": true,
    "data": {
        "order_id": 1,
        "order_number": "ORD-20260303120000-1234",
        "total": 109.00
    },
    "message": "Order created successfully"
}
```

#### Get Order
```http
GET /api/cart.php?id=1
```

#### Get User Orders
```http
GET /api/cart.php?action=my-orders&page=1
```

#### Update Order Status (Admin)
```http
PUT /api/cart.php?id=1
Content-Type: application/json

{
    "status": "shipped"
}
```

---

### Contact & Newsletter

#### Submit Contact Form
```http
POST /api/contact.php?action=contact
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "subject": "Product Inquiry",
    "message": "I have a question about..."
}
```

#### Subscribe to Newsletter
```http
POST /api/contact.php?action=newsletter-subscribe
Content-Type: application/json

{
    "email": "user@example.com"
}
```

#### Unsubscribe from Newsletter
```http
POST /api/contact.php?action=newsletter-unsubscribe
Content-Type: application/json

{
    "email": "user@example.com"
}
```

#### Submit Product Review
```http
POST /api/contact.php?action=review
Content-Type: application/json

{
    "product_id": 1,
    "rating": 5,
    "review_text": "Excellent product, highly recommended!"
}
```

#### Get Contact Messages (Admin)
```http
GET /api/contact.php?action=messages&status=new&page=1
```

---

## 🔐 Security Features

### Implemented
✅ **Password Hashing** - bcrypt with salt  
✅ **SQL Injection Prevention** - Prepared statements  
✅ **CSRF Protection** - Session-based  
✅ **Input Sanitization** - htmlspecialchars + trim  
✅ **Role-Based Access** - Admin/Customer distinction  
✅ **CORS Headers** - Cross-origin support  
✅ **Secure .htaccess** - Directory protection  

### Recommended Enhancements
- Implement JWT for API tokens
- Add rate limiting
- Set up HTTPS/SSL
- Enable HTTPS-only cookies
- Implement 2FA for admin accounts

---

## 📂 Directory Structure

```
velvetvogue/
├── api/                          # API endpoints
│   ├── products.php             # Product API
│   ├── auth.php                 # Authentication API
│   ├── cart.php                 # Cart & Orders API
│   └── contact.php              # Contact & Newsletter API
│
├── includes/                     # Backend configuration
│   └── config.php               # Database & helpers
│
├── logs/                        # Application logs
│   ├── error.log               # PHP errors
│   └── activity.log            # User actions
│
├── database.sql                 # Database schema
├── .htaccess                    # Rewrite rules
└── [HTML/CSS/JS files...]
```

---

## 🔄 Integration with Frontend

### Updating JavaScript to Use PHP APIs

The frontend can be updated to call PHP APIs instead of localStorage:

```javascript
// Example: Get products from PHP API
async function getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/products.php?${params}`);
    const data = await response.json();
    
    if (data.success) {
        displayProducts(data.data.products);
    } else {
        showError(data.message);
    }
}

// Example: Create order
async function createOrder(orderData) {
    const response = await fetch('/api/cart.php?action=create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    
    const data = await response.json();
    return data;
}

// Example: User login
async function loginUser(email, password) {
    const response = await fetch('/api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(data.data));
        showSuccess('Logged in successfully!');
    }
}
```

---

## 🗄️ Database Tables

### users
User accounts with authentication

### products
Product catalog

### product_variants
Sizes and colors for each product

### product_reviews
Customer reviews and ratings

### orders
Order records

### order_items
Items in each order

### user_addresses
Saved delivery addresses

### wishlists
Saved products by users

### coupons
Discount codes

### contact_messages
Customer inquiries

### newsletter_subscriptions
Newsletter subscribers

### audit_log
Activity tracking

---

## 🧪 Testing the API

### Using cURL

```bash
# Get products
curl http://localhost:8000/api/products.php

# Login
curl -X POST http://localhost:8000/api/auth.php?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@velvetvogue.com","password":"password"}'

# Create product
curl -X POST http://localhost:8000/api/products.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":49.99,"category":"casual"}'
```

### Using Postman

1. Import the collection from `postman_collection.json`
2. Set environment variables
3. Test each endpoint

---

## 📊 Sample Data

Default admin account:
- **Email:** admin@velvetvogue.com
- **Password:** password

12 sample products are pre-loaded with the database schema.

---

## 🚨 Troubleshooting

### Common Issues

**1. "Database connection failed"**
- Check DB_HOST, DB_USER, DB_PASS in config.php
- Verify MySQL is running
- Check database exists

**2. "404 API endpoint not found"**
- Enable mod_rewrite: `a2enmod rewrite`
- Restart Apache: `systemctl restart apache2`
- Check .htaccess permissions

**3. "Permission denied on logs directory"**
```bash
mkdir -p /path/to/velvetvogue/logs
chmod 777 /path/to/velvetvogue/logs
```

**4. "Session not persisting"**
- Check PHP session.save_path is writable
- Verify session.cookie_secure setting
- Check browser cookies are enabled

---

## 📈 Performance Optimization

### Database Indexing
Indexes are automatically created on:
- User emails
- Product categories
- Order dates
- Review product IDs

### Query Optimization
- Use pagination for large datasets
- Implement caching for product listings
- Use LIMIT for reviews display

### API Caching Headers
Add caching for static responses:
```php
header('Cache-Control: public, max-age=3600');
header('ETag: ' . md5($content));
```

---

## 🔗 Next Steps

1. **Email Integration**
   - Implement PHPMailer for confirmations
   - Set up email templates

2. **Payment Gateway**
   - Integrate Stripe or PayPal
   - Handle payment processing

3. **Advanced Features**
   - Implement search filters
   - Add product recommendations
   - Set up email notifications

4. **Monitoring**
   - Set up error logging
   - Monitor database performance
   - Track user activities

---

**Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** Production Ready
