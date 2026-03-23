<?php
/**
 * Velvet Vogue - Contact & Newsletter API
 * Handles contact form submissions and newsletter subscriptions
 */

require_once __DIR__ . '/../includes/config.php';

class ContactAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * POST - Submit contact form
     */
    public function submitContact() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();

        // Validation
        if (empty($data['name']) || empty($data['email']) || empty($data['message'])) {
            sendError('Name, email, and message are required', 400);
        }

        if (!validateEmail($data['email'])) {
            sendError('Invalid email format', 400);
        }

        $name = $this->db->real_escape_string(sanitizeInput($data['name']));
        $email = $this->db->real_escape_string(sanitizeInput($data['email']));
        $phone = $this->db->real_escape_string(sanitizeInput($data['phone'] ?? ''));
        $subject = $this->db->real_escape_string(sanitizeInput($data['subject'] ?? 'General Inquiry'));
        $message = $this->db->real_escape_string(sanitizeInput($data['message']));

        $sql = "INSERT INTO contact_messages (name, email, phone, subject, message)
                VALUES ('$name', '$email', '$phone', '$subject', '$message')";

        if ($this->db->query($sql)) {
            $contactId = $this->db->insert_id;

            // Send confirmation email (you would implement actual email sending here)
            $this->sendConfirmationEmail($email, $name);

            logAction('CONTACT_SUBMISSION', getCurrentUserId(), "Contact from: $email");

            sendSuccess([
                'id' => $contactId,
                'message' => 'Your message has been received. We will respond shortly.'
            ], 'Contact message submitted successfully', 201);
        } else {
            sendError('Failed to submit contact message: ' . $this->db->error);
        }
    }

    /**
     * POST - Subscribe to newsletter
     */
    public function subscribeNewsletter() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();

        if (empty($data['email'])) {
            sendError('Email is required', 400);
        }

        if (!validateEmail($data['email'])) {
            sendError('Invalid email format', 400);
        }

        $email = $this->db->real_escape_string(strtolower($data['email']));

        // Check if already subscribed
        $checkResult = $this->db->query("SELECT id FROM newsletter_subscriptions WHERE email = '$email' AND is_active = TRUE");

        if ($checkResult->num_rows > 0) {
            sendError('Email is already subscribed', 409);
        }

        $sql = "INSERT INTO newsletter_subscriptions (email, is_active)
                VALUES ('$email', TRUE)
                ON DUPLICATE KEY UPDATE is_active = TRUE, unsubscribed_at = NULL";

        if ($this->db->query($sql)) {
            // Send welcome email (you would implement actual email sending here)
            $this->sendWelcomeEmail($email);

            logAction('NEWSLETTER_SUBSCRIBE', getCurrentUserId(), "Email: $email");

            sendSuccess(null, 'Successfully subscribed to our newsletter', 201);
        } else {
            sendError('Failed to subscribe: ' . $this->db->error);
        }
    }

    /**
     * POST - Unsubscribe from newsletter
     */
    public function unsubscribeNewsletter() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        $data = getJsonInput();

        if (empty($data['email'])) {
            sendError('Email is required', 400);
        }

        $email = $this->db->real_escape_string(strtolower($data['email']));

        $sql = "UPDATE newsletter_subscriptions SET is_active = FALSE, unsubscribed_at = NOW() WHERE email = '$email'";

        if ($this->db->query($sql)) {
            logAction('NEWSLETTER_UNSUBSCRIBE', getCurrentUserId(), "Email: $email");
            sendSuccess(null, 'Successfully unsubscribed from our newsletter');
        } else {
            sendError('Failed to unsubscribe: ' . $this->db->error);
        }
    }

    /**
     * POST - Submit product review
     */
    public function submitReview() {
        if (!isPost()) {
            sendError('Method not allowed', 405);
        }

        if (!isLoggedIn()) {
            sendError('Not authenticated', 401);
        }

        $data = getJsonInput();

        // Validation
        if (empty($data['product_id']) || empty($data['rating']) || empty($data['review_text'])) {
            sendError('Product ID, rating, and review text are required', 400);
        }

        $productId = (int)$data['product_id'];
        $rating = (int)$data['rating'];
        $reviewText = $this->db->real_escape_string(sanitizeInput($data['review_text']));

        if ($rating < 1 || $rating > 5) {
            sendError('Rating must be between 1 and 5', 400);
        }

        $userId = getCurrentUserId();

        // Check if user already reviewed this product
        $checkResult = $this->db->query("SELECT id FROM product_reviews WHERE product_id = $productId AND user_id = $userId");

        if ($checkResult->num_rows > 0) {
            sendError('You have already reviewed this product', 409);
        }

        $sql = "INSERT INTO product_reviews (product_id, user_id, rating, review_text)
                VALUES ($productId, $userId, $rating, '$reviewText')";

        if ($this->db->query($sql)) {
            $reviewId = $this->db->insert_id;

            // Update product rating and review count
            $this->updateProductRating($productId);

            logAction('SUBMIT_REVIEW', $userId, "Product ID: $productId, Rating: $rating");

            sendSuccess([
                'id' => $reviewId,
                'message' => 'Review submitted successfully'
            ], 'Thank you for your review!', 201);
        } else {
            sendError('Failed to submit review: ' . $this->db->error);
        }
    }

    /**
     * GET - Get contact messages (Admin only)
     */
    public function getContactMessages() {
        if (!isLoggedIn() || !isAdmin()) {
            sendError('Unauthorized', 401);
        }

        $status = isset($_GET['status']) ? $this->db->real_escape_string($_GET['status']) : '';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = 20;
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT * FROM contact_messages";

        if (!empty($status)) {
            $sql .= " WHERE status = '$status'";
        }

        // Get total count
        $countResult = $this->db->query("SELECT COUNT(*) as count FROM contact_messages" . (!empty($status) ? " WHERE status = '$status'" : ''));
        $countRow = $countResult->fetch_assoc();
        $totalCount = $countRow['count'];
        $totalPages = ceil($totalCount / $perPage);

        $sql .= " ORDER BY created_at DESC LIMIT $perPage OFFSET $offset";
        $result = $this->db->query($sql);

        $messages = [];
        while ($row = $result->fetch_assoc()) {
            $messages[] = $row;
        }

        sendSuccess([
            'messages' => $messages,
            'pagination' => [
                'currentPage' => $page,
                'perPage' => $perPage,
                'total' => $totalCount,
                'pages' => $totalPages
            ]
        ], 'Contact messages retrieved');
    }

    /**
     * Helper: Update product rating
     */
    private function updateProductRating($productId) {
        $productId = (int)$productId;

        // Calculate average rating and review count
        $sql = "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
                FROM product_reviews
                WHERE product_id = $productId";

        $result = $this->db->query($sql);
        $data = $result->fetch_assoc();

        $avgRating = $data['avg_rating'] ? round($data['avg_rating'], 2) : 0;
        $reviewCount = $data['review_count'];

        // Update product
        $updateSql = "UPDATE products SET rating = $avgRating, review_count = $reviewCount WHERE id = $productId";
        $this->db->query($updateSql);
    }

    /**
     * Helper: Send confirmation email
     */
    private function sendConfirmationEmail($email, $name) {
        // TODO: Implement actual email sending using PHPMailer or similar
        // This is a placeholder for email functionality
        $subject = "Message Received - Velvet Vogue";
        $message = "Dear $name,\n\nThank you for contacting Velvet Vogue. We have received your message and will respond shortly.\n\nBest regards,\nVelvet Vogue Team";

        // mail($email, $subject, $message);
    }

    /**
     * Helper: Send welcome email
     */
    private function sendWelcomeEmail($email) {
        // TODO: Implement actual email sending using PHPMailer or similar
        $subject = "Welcome to Velvet Vogue Newsletter!";
        $message = "Thank you for subscribing to our newsletter. Stay tuned for exclusive deals and updates!";

        // mail($email, $subject, $message);
    }
}

// Route handling
$api = new ContactAPI();

if (isPost()) {
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'contact':
            $api->submitContact();
            break;
        case 'newsletter-subscribe':
            $api->subscribeNewsletter();
            break;
        case 'newsletter-unsubscribe':
            $api->unsubscribeNewsletter();
            break;
        case 'review':
            $api->submitReview();
            break;
        default:
            sendError('Invalid action', 400);
    }
} elseif (isGet()) {
    if (isset($_GET['action']) && $_GET['action'] === 'messages') {
        $api->getContactMessages();
    } else {
        sendError('Action required', 400);
    }
} else {
    sendError('Method not allowed', 405);
}

?>
