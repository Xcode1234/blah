<?php
/**
 * Velvet Vogue - Shopping Cart API
 * Handles cart operations and order creation
 */

require_once __DIR__ . '/../includes/config.php';

class CartAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * POST - Apply coupon to cart
     */
    public function applyCoupon() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $data = getJsonInput();

        if (empty($data['code']) || empty($data['subtotal'])) {
            sendError('Coupon code and subtotal required', 400);
        }

        $code = $this->db->real_escape_string(strtoupper($data['code']));
        $subtotal = (float)$data['subtotal'];

        // Fetch coupon
        $sql = "SELECT * FROM coupons 
                WHERE code = '$code' 
                AND is_active = TRUE 
                AND (valid_from IS NULL OR valid_from <= CURDATE())
                AND (valid_until IS NULL OR valid_until >= CURDATE())";
        
        $result = $this->db->query($sql);

        if ($result->num_rows === 0) {
            sendError('Invalid or expired coupon code', 404);
        }

        $coupon = $result->fetch_assoc();

        // Check usage limit
        if ($coupon['max_uses'] > 0 && $coupon['current_uses'] >= $coupon['max_uses']) {
            sendError('Coupon usage limit reached', 400);
        }

        // Check minimum purchase
        if ($subtotal < $coupon['min_purchase']) {
            sendError('Minimum purchase of $' . $coupon['min_purchase'] . ' required', 400);
        }

        // Calculate discount
        $discount = 0;
        if ($coupon['discount_type'] === 'percentage') {
            $discount = ($subtotal * $coupon['discount_value']) / 100;
        } else {
            $discount = $coupon['discount_value'];
        }

        // Update coupon usage
        $this->db->query("UPDATE coupons SET current_uses = current_uses + 1 WHERE id = {$coupon['id']}");

        sendSuccess([
            'code' => $coupon['code'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => $coupon['discount_value'],
            'discount_amount' => round($discount, 2),
            'new_total' => round($subtotal - $discount, 2)
        ], 'Coupon applied successfully');
    }

    /**
     * POST - Create order from cart
     */
    public function createOrder() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $data = getJsonInput();

        // Validation
        if (empty($data['items']) || empty($data['total']) || empty($data['shipping_address'])) {
            sendError('Items, total, and shipping address required', 400);
        }

        $userId = getCurrentUserId() ?? null;
        $subtotal = (float)($data['subtotal'] ?? 0);
        $tax = (float)($data['tax'] ?? 0);
        $shippingCost = (float)($data['shipping'] ?? 0);
        $discountAmount = (float)($data['discount'] ?? 0);
        $total = (float)$data['total'];
        $paymentMethod = $this->db->real_escape_string($data['payment_method'] ?? 'credit_card');
        $shippingAddress = $this->db->real_escape_string($data['shipping_address']);
        $notes = $this->db->real_escape_string($data['notes'] ?? '');

        // Generate order number
        $orderNumber = 'ORD-' . date('YmdHis') . '-' . random_int(1000, 9999);

        // Create order
        $sql = "INSERT INTO orders (order_number, user_id, subtotal, tax, shipping_cost, discount_amount, total, payment_method, shipping_address, notes, status)
                VALUES ('$orderNumber', " . ($userId ? $userId : 'NULL') . ", $subtotal, $tax, $shippingCost, $discountAmount, $total, '$paymentMethod', '$shippingAddress', '$notes', 'pending')";

        if (!$this->db->query($sql)) {
            sendError('Failed to create order: ' . $this->db->error);
        }

        $orderId = $this->db->insert_id;

        // Add order items
        foreach ($data['items'] as $item) {
            $productId = (int)$item['product_id'];
            $quantity = (int)$item['quantity'];
            $price = (float)$item['price'];
            $subtotalItem = $quantity * $price;
            $size = !empty($item['size']) ? $this->db->real_escape_string($item['size']) : NULL;
            $color = !empty($item['color']) ? $this->db->real_escape_string($item['color']) : NULL;

            $itemSql = "INSERT INTO order_items (order_id, product_id, size, color, quantity, price, subtotal)
                       VALUES ($orderId, $productId, " . ($size ? "'$size'" : 'NULL') . ", " . ($color ? "'$color'" : 'NULL') . ", $quantity, $price, $subtotalItem)";

            if (!$this->db->query($itemSql)) {
                sendError('Failed to add order item: ' . $this->db->error);
            }
        }

        logAction('CREATE_ORDER', $userId, "Order created: $orderNumber");

        sendSuccess([
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'total' => $total
        ], 'Order created successfully', 201);
    }

    /**
     * GET - Get order by ID
     */
    public function getOrder($orderId) {
        $orderId = (int)$orderId;

        $sql = "SELECT * FROM orders WHERE id = $orderId";
        $result = $this->db->query($sql);

        if ($result->num_rows === 0) {
            sendError('Order not found', 404);
        }

        $order = $result->fetch_assoc();

        // Fetch order items
        $itemsSql = "SELECT oi.*, p.name, p.image_url FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = $orderId";
        $itemsResult = $this->db->query($itemsSql);

        $order['items'] = [];
        while ($item = $itemsResult->fetch_assoc()) {
            $order['items'][] = $item;
        }

        sendSuccess($order, 'Order retrieved successfully');
    }

    /**
     * GET - Get user orders
     */
    public function getUserOrders() {
        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $userId = getCurrentUserId();
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = 10;
        $offset = ($page - 1) * $perPage;

        // Get total count
        $countResult = $this->db->query("SELECT COUNT(*) as count FROM orders WHERE user_id = $userId");
        $countRow = $countResult->fetch_assoc();
        $totalCount = $countRow['count'];
        $totalPages = ceil($totalCount / $perPage);

        $sql = "SELECT * FROM orders WHERE user_id = $userId ORDER BY created_at DESC LIMIT $perPage OFFSET $offset";
        $result = $this->db->query($sql);

        $orders = [];
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }

        sendSuccess([
            'orders' => $orders,
            'pagination' => [
                'currentPage' => $page,
                'perPage' => $perPage,
                'total' => $totalCount,
                'pages' => $totalPages
            ]
        ], 'Orders retrieved successfully');
    }

    /**
     * PUT - Update order status (Admin only)
     */
    public function updateOrderStatus($orderId) {
        if (!isLoggedIn() || !isAdmin()) {
            sendError('Unauthorized', 401);
        }

        $data = getJsonInput();

        if (empty($data['status'])) {
            sendError('Status required', 400);
        }

        $orderId = (int)$orderId;
        $status = $this->db->real_escape_string($data['status']);
        $validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

        if (!in_array($status, $validStatuses)) {
            sendError('Invalid status', 400);
        }

        $sql = "UPDATE orders SET status = '$status' WHERE id = $orderId";

        if ($this->db->query($sql)) {
            logAction('UPDATE_ORDER_STATUS', getCurrentUserId(), "Order $orderId status changed to $status");
            sendSuccess(null, 'Order status updated successfully');
        } else {
            sendError('Failed to update order: ' . $this->db->error);
        }
    }

    /**
     * GET - Retrieve user's cart from server
     */
    public function getCart() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $userId = getCurrentUserId();
        $sql = "SELECT cart_data FROM user_carts WHERE user_id = $userId";
        $result = $this->db->query($sql);

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $cartData = json_decode($row['cart_data'], true) ?: [];
            sendSuccess(['cart' => $cartData], 'Cart retrieved successfully');
        } else {
            sendSuccess(['cart' => []], 'Cart is empty');
        }
    }

    /**
     * POST/PUT - Save user's cart to server
     */
    public function saveCart() {
        error_log('saveCart: Called. Session: ' . json_encode($_SESSION));
        error_log('saveCart: Cookies: user_id=' . ($_COOKIE['user_id'] ?? 'none'));
        
        if (!isLoggedIn()) {
            error_log('saveCart: Not logged in');
            sendError('Authentication required', 401);
        }

        $data = getJsonInput();
        $userId = getCurrentUserId();
        error_log('saveCart: User ID: ' . $userId . ', Cart items: ' . count($data['cart'] ?? []));
        
        $cartData = isset($data['cart']) ? json_encode($data['cart']) : '[]';
        $cartData = $this->db->real_escape_string($cartData);

        $sql = "INSERT INTO user_carts (user_id, cart_data, updated_at) 
                VALUES ($userId, '$cartData', NOW())
                ON DUPLICATE KEY UPDATE cart_data = '$cartData', updated_at = NOW()";

        if ($this->db->query($sql)) {
            error_log('saveCart: SUCCESS for user ' . $userId);
            sendSuccess(null, 'Cart saved successfully');
        } else {
            error_log('saveCart: FAILED - ' . $this->db->error);
            sendError('Failed to save cart: ' . $this->db->error);
        }
    }

    /**
     * GET - Retrieve user's addresses from server
     */
    public function getAddresses() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $userId = getCurrentUserId();
        $sql = "SELECT addresses_data FROM user_addresses WHERE user_id = $userId";
        $result = $this->db->query($sql);

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $addresses = json_decode($row['addresses_data'], true) ?: [];
            sendSuccess(['addresses' => $addresses], 'Addresses retrieved successfully');
        } else {
            sendSuccess(['addresses' => []], 'No addresses found');
        }
    }

    /**
     * POST/PUT - Save user's addresses to server
     */
    public function saveAddresses() {
        if (!isLoggedIn()) {
            sendError('Authentication required', 401);
        }

        $data = getJsonInput();
        $userId = getCurrentUserId();
        $addressesData = isset($data['addresses']) ? json_encode($data['addresses']) : '[]';
        $addressesData = $this->db->real_escape_string($addressesData);

        $sql = "INSERT INTO user_addresses (user_id, addresses_data, updated_at) 
                VALUES ($userId, '$addressesData', NOW())
                ON DUPLICATE KEY UPDATE addresses_data = '$addressesData', updated_at = NOW()";

        if ($this->db->query($sql)) {
            sendSuccess(null, 'Addresses saved successfully');
        } else {
            sendError('Failed to save addresses: ' . $this->db->error);
        }
    }
}

// Route handling
$api = new CartAPI();

if (isPost()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'apply-coupon':
            $api->applyCoupon();
            break;
        case 'create-order':
            $api->createOrder();
            break;
        case 'save-cart':
            $api->saveCart();
            break;
        case 'save-addresses':
            $api->saveAddresses();
            break;
        default:
            sendError('Invalid action', 400);
    }
} elseif (isGet()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    if (isset($_GET['id'])) {
        $api->getOrder($_GET['id']);
    } elseif ($action === 'my-orders') {
        $api->getUserOrders();
    } elseif ($action === 'get-cart') {
        $api->getCart();
    } elseif ($action === 'get-addresses') {
        $api->getAddresses();
    } else {
        sendError('Action required', 400);
    }
} elseif (isPut() && isset($_GET['id'])) {
    $api->updateOrderStatus($_GET['id']);
} else {
    sendError('Method not allowed', 405);
}

?>
