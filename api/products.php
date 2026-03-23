<?php
/**
 * Velvet Vogue - Products API
 * Handles all product-related operations
 */

require_once __DIR__ . '/../includes/config.php';

class ProductAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * GET - Fetch all products with optional filtering
     */
    public function getProducts() {
        $category = isset($_GET['category']) ? sanitizeInput($_GET['category']) : '';
        $gender = isset($_GET['gender']) ? sanitizeInput($_GET['gender']) : '';
        $minPrice = isset($_GET['minPrice']) ? (float)$_GET['minPrice'] : 0;
        $maxPrice = isset($_GET['maxPrice']) ? (float)$_GET['maxPrice'] : 99999;
        $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : '';
        $sortBy = isset($_GET['sortBy']) ? sanitizeInput($_GET['sortBy']) : 'newest';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = 12;
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT * FROM products WHERE is_active = TRUE";

        if (!empty($category)) {
            $category = $this->db->real_escape_string($category);
            $sql .= " AND category = '$category'";
        }

        if (!empty($gender)) {
            $gender = $this->db->real_escape_string($gender);
            $sql .= " AND gender = '$gender'";
        }

        $sql .= " AND price BETWEEN $minPrice AND $maxPrice";

        if (!empty($search)) {
            $search = $this->db->real_escape_string($search);
            $sql .= " AND (MATCH(name, description) AGAINST('$search' IN BOOLEAN MODE) OR name LIKE '%$search%')";
        }

        // Apply sorting
        switch ($sortBy) {
            case 'price_asc':
                $sql .= " ORDER BY price ASC";
                break;
            case 'price_desc':
                $sql .= " ORDER BY price DESC";
                break;
            case 'rating':
                $sql .= " ORDER BY rating DESC";
                break;
            case 'popular':
                $sql .= " ORDER BY review_count DESC";
                break;
            case 'newest':
            default:
                $sql .= " ORDER BY created_at DESC";
        }

        // Get total count
        $countResult = $this->db->query("SELECT COUNT(*) as count FROM products WHERE is_active = TRUE AND price BETWEEN $minPrice AND $maxPrice");
        $countRow = $countResult->fetch_assoc();
        $totalCount = $countRow['count'];
        $totalPages = ceil($totalCount / $perPage);

        $sql .= " LIMIT $perPage OFFSET $offset";
        $result = $this->db->query($sql);

        $products = [];
        while ($row = $result->fetch_assoc()) {
            $row['sizes'] = $this->getProductSizes($row['id']);
            $row['colors'] = $this->getProductColors($row['id']);
            $products[] = $row;
        }

        sendSuccess([
            'products' => $products,
            'pagination' => [
                'currentPage' => $page,
                'perPage' => $perPage,
                'total' => $totalCount,
                'pages' => $totalPages
            ]
        ], 'Products retrieved successfully');
    }

    /**
     * GET - Fetch single product by ID
     */
    public function getProduct($id) {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }
        $id = (int)$id;
        $sql = "SELECT * FROM products WHERE id = $id AND is_active = TRUE";
        $result = $this->db->query($sql);

        if ($result->num_rows === 0) {
            sendError('Product not found', 404);
        }

        $product = $result->fetch_assoc();
        $product['sizes'] = $this->getProductSizes($id);
        $product['colors'] = $this->getProductColors($id);
        $product['reviews'] = $this->getProductReviews($id);
        $product['stock_info'] = $this->getProductStockInfo($id);

        sendSuccess($product, 'Product retrieved successfully');
    }

    /**
     * POST - Add new product (Admin only)
     */
    public function createProduct() {
        if (!isLoggedIn() || !isAdmin()) {
            sendError('Unauthorized', 401);
        }

        $data = getJsonInput();

        // Validate required fields
        if (empty($data['name']) || empty($data['price']) || empty($data['category'])) {
            sendError('Missing required fields', 400);
        }

        $name = $this->db->real_escape_string($data['name']);
        $description = $this->db->real_escape_string($data['description'] ?? '');
        $category = $this->db->real_escape_string($data['category']);
        $gender = $this->db->real_escape_string($data['gender'] ?? 'unisex');
        $price = (float)$data['price'];
        $originalPrice = isset($data['original_price']) ? (float)$data['original_price'] : null;
        $sku = $this->db->real_escape_string($data['sku'] ?? 'SKU-' . time());
        $stock = (int)($data['stock'] ?? 0);
        $imageUrl = $this->db->real_escape_string($data['image_url'] ?? '');

        $originalPriceSQL = $originalPrice ? $originalPrice : 'NULL';

        $sql = "INSERT INTO products (name, description, category, gender, price, original_price, sku, stock, image_url)
                VALUES ('$name', '$description', '$category', '$gender', $price, $originalPriceSQL, '$sku', $stock, '$imageUrl')";

        if ($this->db->query($sql)) {
            $productId = $this->db->insert_id;

            // Add variants if provided
            if (isset($data['variants']) && is_array($data['variants'])) {
                foreach ($data['variants'] as $variant) {
                    $this->addProductVariant($productId, $variant);
                }
            }

            logAction('CREATE_PRODUCT', getCurrentUserId(), "Product: $name (ID: $productId)");
            sendSuccess(['id' => $productId], 'Product created successfully', 201);
        } else {
            sendError('Failed to create product: ' . $this->db->error);
        }
    }

    /**
     * PUT - Update product (Admin only)
     */
    public function updateProduct($id) {
        if (!isLoggedIn() || !isAdmin()) {
            sendError('Unauthorized', 401);
        }

        $id = (int)$id;
        $data = getJsonInput();

        $updates = [];
        $params = [];

        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = sanitizeInput($data['name']);
        }
        if (isset($data['price'])) {
            $updates[] = "price = ?";
            $params[] = (float)$data['price'];
        }
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = sanitizeInput($data['description']);
        }
        if (isset($data['stock'])) {
            $updates[] = "stock = ?";
            $params[] = (int)$data['stock'];
        }

        if (empty($updates)) {
            sendError('No fields to update', 400);
        }

        $params[] = $id;
        $sql = "UPDATE products SET " . implode(", ", $updates) . " WHERE id = ?";

        $stmt = $this->db->prepare($sql);
        $types = str_repeat('s', count($params) - 1) . 'i';

        if ($stmt->bind_param($types, ...$params) && $stmt->execute()) {
            logAction('UPDATE_PRODUCT', getCurrentUserId(), "Product ID: $id");
            sendSuccess(null, 'Product updated successfully');
        } else {
            sendError('Failed to update product: ' . $this->db->error);
        }
    }

    /**
     * DELETE - Delete product (Admin only)
     */
    public function deleteProduct($id) {
        if (!isLoggedIn() || !isAdmin()) {
            sendError('Unauthorized', 401);
        }

        $id = (int)$id;

        $sql = "DELETE FROM products WHERE id = $id";

        if ($this->db->query($sql)) {
            logAction('DELETE_PRODUCT', getCurrentUserId(), "Product ID: $id");
            sendSuccess(null, 'Product deleted successfully');
        } else {
            sendError('Failed to delete product: ' . $this->db->error);
        }
    }

    /**
     * Get product sizes from variants
     */
    private function getProductSizes($productId) {
        $productId = (int)$productId;
        $sql = "SELECT DISTINCT size FROM product_variants WHERE product_id = $productId AND size IS NOT NULL";
        $result = $this->db->query($sql);

        $sizes = [];
        while ($row = $result->fetch_assoc()) {
            if ($row['size']) {
                $sizes[] = $row['size'];
            }
        }
        return $sizes;
    }

    /**
     * Get product colors from variants
     */
    private function getProductColors($productId) {
        $productId = (int)$productId;
        $sql = "SELECT DISTINCT color FROM product_variants WHERE product_id = $productId AND color IS NOT NULL";
        $result = $this->db->query($sql);

        $colors = [];
        while ($row = $result->fetch_assoc()) {
            if ($row['color']) {
                $colors[] = $row['color'];
            }
        }
        return $colors;
    }

    /**
     * Get product reviews
     */
    private function getProductReviews($productId) {
        $productId = (int)$productId;
        $sql = "SELECT r.*, u.first_name, u.last_name FROM product_reviews r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.product_id = $productId
                ORDER BY r.created_at DESC
                LIMIT 10";
        $result = $this->db->query($sql);

        $reviews = [];
        while ($row = $result->fetch_assoc()) {
            $reviews[] = $row;
        }
        return $reviews;
    }

    /**
     * Get product stock information
     */
    private function getProductStockInfo($productId) {
        $productId = (int)$productId;
        $sql = "SELECT product_id, COUNT(*) as variant_count, SUM(stock) as total_stock
                FROM product_variants
                WHERE product_id = $productId
                GROUP BY product_id";
        $result = $this->db->query($sql);

        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }

        return ['variant_count' => 0, 'total_stock' => 0];
    }

    /**
     * Add product variant
     */
    private function addProductVariant($productId, $variant) {
        $productId = (int)$productId;
        $size = $this->db->real_escape_string($variant['size'] ?? '');
        $color = $this->db->real_escape_string($variant['color'] ?? '');
        $stock = (int)($variant['stock'] ?? 0);
        $sku = $this->db->real_escape_string($variant['sku'] ?? 'VAR-' . time());

        $sql = "INSERT INTO product_variants (product_id, size, color, stock, variant_sku)
                VALUES ($productId, " . (!empty($size) ? "'$size'" : 'NULL') . ",
                        " . (!empty($color) ? "'$color'" : 'NULL') . ",
                        $stock, '$sku')
                ON DUPLICATE KEY UPDATE stock = $stock";

        return $this->db->query($sql);
    }
}

// Route handling
$api = new ProductAPI();

if (isGet()) {
    if (isset($_GET['id'])) {
        $api->getProduct($_GET['id']);
    } else {
        $api->getProducts();
    }
} elseif (isPost()) {
    $api->createProduct();
} elseif (isPut() && isset($_GET['id'])) {
    $api->updateProduct($_GET['id']);
} elseif (isDelete() && isset($_GET['id'])) {
    $api->deleteProduct($_GET['id']);
} else {
    sendError('Method not allowed', 405);
}

?>
