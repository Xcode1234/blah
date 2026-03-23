// ============================================================
// VELVET VOGUE - MOBILE SPECIFIC FUNCTIONALITY
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeMobileSearch();
    initializeBottomNav();
    initializeThemeToggle();
});

// ============================================================
// MOBILE MENU
// ============================================================

function initializeMobileMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuLinks = mobileMenu?.querySelectorAll('a') || [];

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.style.display = mobileMenu.style.display === 'none' ? 'flex' : 'none';
        });

        // Close menu when clicking on a link
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && e.target !== menuBtn) {
                mobileMenu.style.display = 'none';
            }
        });
    }
}

// ============================================================
// MOBILE SEARCH
// ============================================================

function initializeMobileSearch() {
    const searchBtn = document.getElementById('search-btn-mobile');
    const searchBar = document.getElementById('search-bar-mobile');
    const searchClose = document.getElementById('search-close-mobile');
    const searchInput = document.getElementById('search-input-mobile');

    if (searchBtn && searchBar) {
        searchBtn.addEventListener('click', () => {
            searchBar.style.display = 'flex';
            searchInput?.focus();
        });

        if (searchClose) {
            searchClose.addEventListener('click', () => {
                searchBar.style.display = 'none';
            });
        }
    }
}

// ============================================================
// BOTTOM NAVIGATION
// ============================================================

function initializeBottomNav() {
    const cartNavBtn = document.getElementById('cart-nav-btn');
    const searchNavBtn = document.getElementById('search-nav-btn');
    const searchBar = document.getElementById('search-bar-mobile');

    if (cartNavBtn) {
        cartNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Navigate to cart page
            window.location.href = 'pages/cart.html';
        });
    }

    if (searchNavBtn) {
        searchNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchBar.style.display = 'flex';
            document.getElementById('search-input-mobile')?.focus();
        });
    }

    // Update cart badge
    updateCartBadge();
}

function updateCartBadge() {
    const cartCount = localStorage.getItem('cart')?.length || 0;
    const badge = document.getElementById('cart-count-mobile');
    if (badge) {
        badge.textContent = cartCount;
        badge.style.display = cartCount > 0 ? 'flex' : 'none';
    }
}

// ============================================================
// THEME TOGGLE
// ============================================================

function initializeThemeToggle() {
    // Mobile version uses system preference by default
    // But allow manual toggle if needed
    const savedTheme = localStorage.getItem('velvet-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// ============================================================
// PRODUCT CARD INTERACTION
// ============================================================

document.addEventListener('click', function(e) {
    const productCard = e.target.closest('.product-card-mobile');
    if (productCard && productCard.dataset.productId) {
        window.location.href = `pages/product.html?id=${productCard.dataset.productId}`;
    }
});

// ============================================================
// SCROLL BEHAVIOR
// ============================================================

// Hide bottom nav on scroll up, show on scroll down
let lastScrollTop = 0;
const bottomNav = document.querySelector('.mobile-bottom-nav');

if (bottomNav) {
    document.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > lastScrollTop && currentScroll > 100) {
            // Scrolling down
            bottomNav.style.transform = 'translateY(100%)';
        } else {
            // Scrolling up
            bottomNav.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });
}
