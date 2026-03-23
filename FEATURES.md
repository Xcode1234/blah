# VELVET VOGUE - FEATURES & FUNCTIONALITY GUIDE

Complete documentation of all features implemented in the Velvet Vogue e-commerce website.

## 📑 Table of Contents
1. [Product Management](#product-management)
2. [Shopping Cart](#shopping-cart)
3. [Product Filtering & Search](#product-filtering--search)
4. [User Authentication](#user-authentication)
5. [User Profiles](#user-profiles)
6. [Order Management](#order-management)
7. [Admin Panel](#admin-panel)
8. [Contact & Support](#contact--support)
9. [Additional Features](#additional-features)

---

## Product Management

### Product Catalog
**Location:** `Shop` page (pages/shop.html)  
**Data Source:** `data/products.json`

**Product Information:**
- Product ID (unique identifier)
- Name (product title)
- Category (casual, formal, accessories)
- Gender (male, female, unisex)
- Price (current selling price)
- Original Price (sale price reference)
- Description (product details)
- Image (product photo filename)
- Sizes (available size options)
- Colors (available color options)
- Rating (customer rating 1-5 stars)
- Reviews (number of customer reviews)
- Stock Status (in stock or out of stock)
- Badge (promotional label: "Sale", "New", etc.)

**Sample Products Included:**
- 12 different products
- 3 categories (Casual, Formal, Accessories)
- Multiple gender options
- Various price points ($38-$189)
- Mix of sale and full-price items

### Adding New Products
To add a new product, edit `data/products.json`:

```json
{
  "id": 13,
  "name": "New Product Name",
  "category": "casual",
  "gender": "male",
  "price": 79.99,
  "originalPrice": 99.99,
  "description": "Product description here",
  "image": "product-filename.jpg",
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Black", "White"],
  "rating": 4.5,
  "reviews": 45,
  "inStock": true,
  "badge": "New"
}
```

---

## Shopping Cart

### Cart Features

**Add to Cart:**
- Click "Add to Cart" button on any product
- Select size and color on product detail page
- Specify quantity before adding
- Notification confirms item added

**Cart Persistence:**
- Shopping cart saved to browser's localStorage
- Cart persists even after closing browser
- Cart survives across multiple visits
- Automatic reload on page refresh

**Modify Cart:**
- Increase/decrease quantity with +/- buttons
- Remove individual items with trash icon
- View cart at any time via cart icon badge
- Real-time total calculations

**Cart Summary:**
- Subtotal (sum of all items)
- Shipping cost ($0 if over $50, otherwise $10)
- Tax calculation (10% of subtotal)
- Discount (applied via coupon codes)
- Total price prominently displayed

### Coupon Codes

**Available Codes:**
- **VELVET25:** 25% discount
- **STYLE20:** 20% discount
- **WELCOME10:** 10% discount

**How to Use:**
1. Go to Shopping Cart page
2. Scroll to "Order Summary" section
3. Enter coupon code in "Coupon Code" field
4. Click "Apply" button
5. Discount applies immediately
6. Total updates to reflect savings

**Discount Logic:**
- One coupon per order
- Applied to subtotal before tax
- Calculation: `Discount Amount = Subtotal × Discount Percentage`
- Cannot combine multiple coupons

---

## Product Filtering & Search

### Product Filtering

**Available Filters:**

1. **Category Filter (Radio Button - Single Selection)**
   - All Products (default)
   - Casual Wear
   - Formal Wear
   - Accessories

2. **Gender Filter (Checkboxes - Multiple Selection)**
   - Men (✓ Men's products)
   - Women (✓ Women's products)
   - Unisex (✓ Unisex products)
   - Can select multiple genders simultaneously

3. **Price Range Filter (Radio Button - Single Selection)**
   - All Prices (default)
   - Under $50
   - $50 - $100
   - $100 - $200
   - Over $200

4. **Sort Options (Dropdown)**
   - Newest First (default - reverse order)
   - Price: Low to High
   - Price: High to Low
   - Top Rated (highest rating first)
   - Name A-Z (alphabetical)

**Filter Behavior:**
- Real-time updates without page reload
- Multiple filters combine with AND logic
- Product count updates dynamically
- Breadcrumb navigation shows current category
- "Clear Filters" button resets all selections

**Filter Examples:**
- Select "Formal" + "Male" = only formal wear for men
- Select "Casual" + "$50-100" = casual wear between $50-100
- Select "Female" + "Under $50" = women's items under $50
- Select multiple genders = products for all selected genders

### Product Search

**Search Features:**
- Click search icon in header to open search bar
- Type to search in real-time
- Searches product names and descriptions
- Case-insensitive matching
- Results update immediately as you type
- No page reload required

**Search Examples:**
- "shirt" → finds "Premium Cotton T-Shirt"
- "formal" → finds all formal wear products
- "price $45" → finds products around that price
- "black" → finds products available in black

**Sorting Search Results:**
- Use sort dropdown to organize search results
- Same sorting options as category view

---

## User Authentication

### Login

**Login Page:** pages/account.html

**Login Process:**
1. Navigate to Account page
2. Go to "Sign In" section
3. Enter email address
4. Enter password
5. Optional: Check "Remember me"
6. Click "Sign In" button

**After Login:**
- Profile section displays
- User avatar shows with initials
- Access to profile, orders, addresses, admin
- "Logout" button appears in tab navigation
- Shop and cart pages become available; visiting them while logged out will redirect the visitor to the login form.

**Test Credentials:**
- Email: `any@email.com`
- Password: `any password` (demo mode accepts anything)

### Registration

**Registration Process:**
1. Navigate to Account page
2. Go to "Create Account" section
3. Enter first name
4. Enter last name
5. Enter email address
6. Create password
7. Confirm password
8. Agree to Terms and Privacy Policy
9. Click "Create Account"

**Account Creation:**
- Validates all fields are filled
- Checks password confirmation matches
- Requires terms acceptance
- Creates user profile automatically

### Logout

**Logout Process:**
1. Go to "My Account" page
2. Click "Logout" button (top right)
3. Confirmation message
4. Returns to login page

**Data After Logout:**
- Cart items remain (localStorage)
- User profile clears
- Must login again to access account
- Wishlist persists (localStorage)

---

## User Profiles

### Profile Management

**Profile Information Display:**
- User avatar (initials in colored background)
- Full name
- Member since date
- Email address
- Phone number
- Account status

**Edit Profile:**
1. Click "Profile" tab in account page
2. Enter/update information:
   - First name
   - Last name
   - Email address
   - Phone number
3. Click "Save Changes"
4. Confirmation message

**Editable Fields:**
- First name
- Last name
- Email address
- Phone number

---

## Order Management

### Order History

**Access Order History:**
1. Login to account
2. Click "Order History" tab
3. View list of past orders

**Order Information:**
- Order ID
- Order date
- Order total
- Order status
- Items in order
- Tracking (future feature)

**Order Status Indicators:**
- ✓ **Completed** (Green) - Order delivered
- ⏳ **Pending** (Yellow) - Processing
- 📦 **Shipping** (Blue) - In transit

### Address Management

**View Saved Addresses:**
1. Login to account
2. Click "Addresses" tab
3. View all saved addresses

**Add New Address:**
1. Click "Addresses" tab
2. Fill in address form:
   - Street address
   - City
   - State
   - ZIP code
   - Country
3. Click "Add Address"
4. Address saved for future orders

**Default Shipping:**
- Most recent address used for checkout
- Can select different address at checkout
- Multiple addresses supported

---

## Admin Panel

### Admin Access

**Login as Admin:**
1. Register or login with admin credentials
2. Navigate to "My Account"
3. Admin panel appears in tab navigation

**Admin Role:**
- Full product management access
- View inventory statistics
- Add, edit, delete products
- View all customer orders
- Access analytics (future)

### Product Management

**View Statistics:**
- Total number of products in catalog
- Total number of orders processed
- Additional metrics (future)

**Add New Product:**
1. Go to Admin Panel
2. Fill in "Add New Product" form:
   - Product name (required)
   - Category selection (required)
   - Price in dollars (required)
   - Stock quantity (required)
   - Product description (required)
   - Image URL (required)
3. Click "Add Product"
4. Product appears in catalog immediately

**Product Fields:**
- **Name:** Full product title
- **Category:** Casual / Formal / Accessories
- **Price:** Selling price (decimal format)
- **Stock:** Quantity available
- **Description:** Product details
- **Image URL:** Link to product image

**After Adding Product:**
- Confirmation message
- Form clears for next product
- New product visible on shop page
- Available for purchase immediately

---

## Contact & Support

### Contact Information

**Display Information:**
- Physical address
- Phone number with hours
- Multiple email addresses
- Business hours
- Social media links

**Contact Methods:**
- Phone: 1-800-VELVET-1
- Email: info@velvetvogue.com
- Email: support@velvetvogue.com
- Location: 123 Fashion Street, Style City, SC 12345

### Contact Form

**Form Fields:**
- Full name (required)
- Email address (required)
- Phone number (optional)
- Subject dropdown (required)
  - Product Inquiry
  - Order Issue
  - Shipping Question
  - Returns & Exchanges
  - General Feedback
  - Partnership Inquiry
  - Other
- Message textarea (required)
- Consent checkbox (required)

**Form Submission:**
1. Fill in all required fields
2. Optionally enter phone
3. Select subject
4. Write message
5. Check consent box
6. Click "Send Message"
7. Confirmation message

### FAQ Section

**Expandable Questions:**

1. **How long does shipping take?**
   - Standard: 5-7 business days
   - Express: 2-3 business days
   - Free shipping on $50+ orders

2. **What is your return policy?**
   - 30-day return window
   - Items must be unused
   - Original tags attached
   - Contact customer service

3. **Do you offer international shipping?**
   - Ships to select North America countries
   - Ships to select Europe countries
   - Contact for international inquiries

4. **How do I use a coupon code?**
   - Enter code at checkout
   - Discount applies automatically
   - One coupon per order

5. **Is my payment information secure?**
   - SSL encryption used
   - PCI-DSS compliant
   - Data never stored on servers
   - Secure payment gateways

**FAQ Usage:**
1. Click on question to expand
2. Read answer
3. Click again to collapse
4. Only one expanded at a time

---

## Additional Features

### Newsletter Subscription

**Subscribe:**
1. On home page, scroll to "Stay Updated" section
2. Enter email address
3. Click "Subscribe"
4. Confirmation message
5. Check email for confirmation link

**Benefits:**
- Exclusive offers and promotions
- New product announcements
- Fashion tips and trends
- Seasonal sale notifications

### Wishlist

**Add to Wishlist:**
1. On any product or shop page
2. Click heart (♡) icon
3. Product added to wishlist
4. Notification confirms

**View Wishlist:**
- Stored in browser localStorage
- Persists across sessions
- Can share with friends (future)
- Convert items to cart (future)

### Product Reviews

**View Reviews:**
1. Go to product detail page
2. Scroll to "Customer Reviews" section
3. See existing reviews with ratings
4. Read customer feedback

**Submit Review:**
1. On product page, scroll to "Leave a Review"
2. Enter your name
3. Select star rating
4. Write review text
5. Click "Submit Review"
6. Review posted (moderated in production)

**Review Information:**
- Customer name
- Star rating (1-5)
- Review text
- Date posted (future)
- Helpful votes (future)

### Product Recommendations

**Recommended Products:**
- Shown on shopping cart page
- Based on browsing history
- Suggests related items
- Encourages additional purchases

**Related Products:**
- Displayed on product detail page
- Similar category items
- Alternative styles
- Complementary products

### Social Media Links

**Social Profiles:**
- Facebook
- Twitter/X
- Instagram
- LinkedIn

**Located in:**
- Footer (all pages)
- About page
- Contact page

---

## Technical Features

### Data Persistence

**localStorage Usage:**
- Cart items (`velvet-cart`)
- User profile (`currentUser`)
- Wishlist items (`wishlist`)
- Discount amount (`discount`)
- Coupon code (`couponCode`)

**Benefits:**
- Data survives page refresh
- Works offline
- No server communication needed
- Instant access

### Responsive Design

**Mobile Features:**
- Touch-friendly buttons
- Single-column layout
- Optimized image sizes
- Readable text sizes
- Smooth scrolling

**Tablet Features:**
- Two-column layouts
- Adjusted spacing
- Optimized grid
- Multi-touch support

**Desktop Features:**
- Multi-column layouts
- Full feature display
- Advanced interactions
- Mouse/keyboard navigation

### Accessibility

**WCAG 2.1 Compliance:**
- Semantic HTML structure
- ARIA labels on form fields
- Color contrast ratio compliance
- Keyboard navigation support
- Focus indicators

**Screen Reader Support:**
- All images have alt text
- Form labels properly associated
- Navigation structure clear
- Content hierarchy maintained

---

## User Workflows

### Customer Workflow

```
1. Browse Products
   ├─ View home page
   ├─ Navigate to shop
   ├─ Search or filter
   └─ View product details

2. Make Purchase
   ├─ Select size & color
   ├─ Choose quantity
   ├─ Add to cart
   └─ Continue shopping

3. Checkout
   ├─ View cart
   ├─ Apply coupon code
   ├─ Review order summary
   ├─ Create/Login account
   └─ Proceed to payment (future)

4. Post-Purchase
   ├─ View order history
   ├─ Track shipment (future)
   ├─ Leave review
   └─ Contact support if needed
```

### Admin Workflow

```
1. Login to Admin Account
   └─ Access admin panel

2. Manage Inventory
   ├─ View product statistics
   ├─ Add new products
   ├─ Edit existing products
   └─ Manage stock levels

3. Manage Orders
   ├─ View customer orders
   ├─ Update order status
   ├─ Process refunds (future)
   └─ Generate reports (future)

4. Manage Content
   ├─ Update promotions
   ├─ Manage categories
   ├─ Configure settings
   └─ View analytics (future)
```

---

## Performance Features

### Optimization

- Real-time filtering without page reload
- Lazy image loading (future)
- CSS minification ready
- JavaScript compression ready
- Efficient DOM manipulation

### Loading

- Instant product display
- No unnecessary API calls
- Optimized asset sizes
- Quick filter application
- Smooth transitions

---

## Future Features

### Short-term
- Payment gateway integration
- Email notifications
- Order tracking
- Advanced inventory management
- Social sharing

### Medium-term
- Backend database
- User authentication (secure)
- API endpoints
- Mobile app
- Advanced analytics

### Long-term
- AI recommendations
- AR virtual try-on
- International expansion
- Wholesale features
- Subscription service

---

## Troubleshooting

### Common Issues

**Cart Not Saving:**
- Check localStorage enabled
- Clear browser cache
- Disable privacy mode
- Check browser storage quota

**Filters Not Working:**
- Refresh page
- Check JavaScript enabled
- Clear cache
- Try different browser

**Images Not Loading:**
- Verify image files exist
- Check file paths
- Verify image URLs
- Use placeholder images

**Login Not Working:**
- Clear cookies
- Try different credentials
- Check localStorage
- Clear browser cache

---

## Support

For questions about features or functionality:
- Email: info@velvetvogue.com
- Phone: 1-800-VELVET-1
- Contact form on website
- Visit about page for more info

---

**Last Updated:** March 3, 2026  
**Version:** 1.0  
**Status:** Complete
