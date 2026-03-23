// ============================================================
// VELVET VOGUE - MAIN JAVASCRIPT FUNCTIONALITY
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        initializeTheme();
        
        // CRITICAL: Load user data FIRST before anything else
        // This ensures currentUser is set from OAuth cookies before cart operations
        loadUserData();
        
        // Check for OAuth login callback AFTER user data is loaded
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('oauth_login') === 'success') {
            handleOAuthLoginSuccess(urlParams.get('provider'));
        }
        
        // Now load cart (will sync with server if currentUser exists)
        loadCart();
        
        await initializeCurrencySystem();
        // wait for the product list to come back before rendering the current
        // view; this ensures the tiles are populated when the user lands on the
        // shop page instead of requiring a second load or filter interaction.
        
        // Show spinner if we're on shop page
        const loadingSpinner = document.getElementById('products-loading');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const noProductsMsg = document.getElementById('no-products');
        const newArrivalsSpinner = document.getElementById('new-arrivals-loading');
        
        if (loadingSpinner && window.location.pathname.includes('shop.html')) {
            loadingSpinner.classList.remove('hidden');
            if (clearFiltersBtn) clearFiltersBtn.style.display = 'none';
            if (noProductsMsg) noProductsMsg.style.display = 'none';
        }
        
        // Show spinner for new arrivals on index page
        if (newArrivalsSpinner && (window.location.pathname.includes('index.html') || window.location.pathname === '/')) {
            newArrivalsSpinner.classList.remove('hidden');
        }
        
        await loadProducts();
        
        // Hide spinner after products are loaded
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
        if (clearFiltersBtn) {
            clearFiltersBtn.style.display = '';
        }
        if (newArrivalsSpinner) {
            newArrivalsSpinner.classList.add('hidden');
        }
        
        setupEventListeners();
        loadCurrentPage();
    } catch (err) {
        console.error('Error during page initialization:', err);
        // Ensure basic functionality still works even if initialization partially fails
        if (!activeCurrencyCode) {
            setActiveCurrency('USD', 1);
        }
        if (!products || products.length === 0) {
            products = getSampleProducts();
        }
        setupEventListeners();
        loadCurrentPage();
    }
    
    // Sync user data every 30 seconds to keep cross-device updates fresh
    setInterval(() => {
        if (currentUser) {
            syncCurrentUserFromServer();
            syncCartWithServer();
            syncAddressesWithServer();
        }
    }, 30000);
});

// Listen for storage changes from other tabs/windows
window.addEventListener('storage', function(e) {
    if (e.key === 'currentUser') {
        if (e.newValue) {
            try {
                currentUser = normalizeCurrentUser(JSON.parse(e.newValue));
                loadCart(); // Reload user-specific cart
                updateUserProfileHeader();
                populateProfileForm();
                updateAccountInfoPanel();
                showLoginSuccess();
            } catch (_err) {
                currentUser = null;
                cart = [];
                loadCart();
                hideLoginSuccess();
            }
        } else {
            // currentUser was removed (logout in another tab)
            currentUser = null;
            cart = [];
            loadCart();
            hideLoginSuccess();
        }
    }
});

// Sync when page becomes visible (user switches back to tab/window)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentUser) {
        syncCurrentUserFromServer();
        syncCartWithServer();
        syncAddressesWithServer();
    }
});

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let products = [];
let cart = [];
let currentUser = null;
let countryData = [];
let stateData = [];
let activeCurrencyCode = 'USD';
let usdToActiveRate = 1;
let cachedUsdRates = { USD: 1 };
let selectedRegion = 'AUTO';
let detectedCountryCode = null; // Track the auto-detected country
let cartSyncCompleted = false; // Track if first get-cart request has completed
const THEME_STORAGE_KEY = 'velvet-theme';
const REGION_STORAGE_KEY = 'velvet-region-preference';
const COUPON_CODES = {
    'VELVET25': { discount: 0.25, label: '25% OFF' },
    'STYLE20': { discount: 0.20, label: '20% OFF' },
    'WELCOME10': { discount: 0.10, label: '10% OFF' }
};

const COUNTRY_TO_CURRENCY = {
    US: 'USD', CA: 'CAD', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
    CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
    AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', SG: 'SGD', MY: 'MYR', TH: 'THB', VN: 'VND', ID: 'IDR', IN: 'INR', PH: 'PHP',
    AF: 'AFN', BD: 'BDT', BT: 'INR', MV: 'MVR', NP: 'NPR', PK: 'PKR', LK: 'LKR',
    AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES', GH: 'GHS', MA: 'MAD',
    BR: 'BRL', AR: 'ARS', MX: 'MXN', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU',
    BO: 'BOB', PY: 'PYG', EC: 'USD', GY: 'GYD', SR: 'SRD', VE: 'VES', GF: 'EUR'
};

const REGION_OPTIONS = [
    { code: 'AUTO', label: 'Auto (Detected)', countryCode: null, flag: '🌐' },
    { code: 'US', label: 'United States', countryCode: 'US', flag: '🇺🇸' },
    { code: 'EU', label: 'Eurozone', countryCode: 'DE', flag: '🇪🇺' },
    { code: 'GB', label: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧' },
    { code: 'CA', label: 'Canada', countryCode: 'CA', flag: '🇨🇦' },
    { code: 'AU', label: 'Australia', countryCode: 'AU', flag: '🇦🇺' },
    { code: 'JP', label: 'Japan', countryCode: 'JP', flag: '🇯🇵' },
    { code: 'AF', label: 'Afghanistan', countryCode: 'AF', flag: '🇦🇫' },
    { code: 'BD', label: 'Bangladesh', countryCode: 'BD', flag: '🇧🇩' },
    { code: 'BT', label: 'Bhutan', countryCode: 'BT', flag: '🇧🇹' },
    { code: 'IN', label: 'India', countryCode: 'IN', flag: '🇮🇳' },
    { code: 'MV', label: 'Maldives', countryCode: 'MV', flag: '🇲🇻' },
    { code: 'NP', label: 'Nepal', countryCode: 'NP', flag: '🇳🇵' },
    { code: 'PK', label: 'Pakistan', countryCode: 'PK', flag: '🇵🇰' },
    { code: 'LK', label: 'Sri Lanka', countryCode: 'LK', flag: '🇱🇰' },
    { code: 'AR', label: 'Argentina', countryCode: 'AR', flag: '🇦🇷' },
    { code: 'BO', label: 'Bolivia', countryCode: 'BO', flag: '🇧🇴' },
    { code: 'BR', label: 'Brazil', countryCode: 'BR', flag: '🇧🇷' },
    { code: 'CL', label: 'Chile', countryCode: 'CL', flag: '🇨🇱' },
    { code: 'CO', label: 'Colombia', countryCode: 'CO', flag: '🇨🇴' },
    { code: 'EC', label: 'Ecuador', countryCode: 'EC', flag: '🇪🇨' },
    { code: 'GY', label: 'Guyana', countryCode: 'GY', flag: '🇬🇾' },
    { code: 'PY', label: 'Paraguay', countryCode: 'PY', flag: '🇵🇾' },
    { code: 'PE', label: 'Peru', countryCode: 'PE', flag: '🇵🇪' },
    { code: 'SR', label: 'Suriname', countryCode: 'SR', flag: '🇸🇷' },
    { code: 'UY', label: 'Uruguay', countryCode: 'UY', flag: '🇺🇾' },
    { code: 'VE', label: 'Venezuela', countryCode: 'VE', flag: '🇻🇪' },
    { code: 'NG', label: 'Nigeria', countryCode: 'NG', flag: '🇳🇬' },
    { code: 'ZA', label: 'South Africa', countryCode: 'ZA', flag: '🇿🇦' },
    { code: 'AE', label: 'UAE', countryCode: 'AE', flag: '🇦🇪' }
];

function isLikelyMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

function getSavedRegionPreference() {
    return localStorage.getItem(REGION_STORAGE_KEY) || 'AUTO';
}

function saveRegionPreference(regionCode) {
    localStorage.setItem(REGION_STORAGE_KEY, regionCode);
}

function isSecureGeoContext() {
    const host = window.location.hostname;
    return window.isSecureContext || host === 'localhost' || host === '127.0.0.1';
}

function getCountryCodeFromLocale() {
    const locale = navigator.language || '';
    const match = locale.match(/-([A-Za-z]{2})$/);
    return match ? match[1].toUpperCase() : null;
}

function getCurrencyForCountry(countryCode) {
    if (!countryCode) return 'USD';
    return COUNTRY_TO_CURRENCY[String(countryCode).toUpperCase()] || 'USD';
}

function convertUsdToActiveCurrency(usdAmount) {
    return (parseFloat(usdAmount) || 0) * (parseFloat(usdToActiveRate) || 1);
}

function formatPrice(usdAmount) {
    const converted = convertUsdToActiveCurrency(usdAmount);
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: activeCurrencyCode,
            maximumFractionDigits: 2
        }).format(converted);
    } catch (_e) {
        return `$${(parseFloat(usdAmount) || 0).toFixed(2)}`;
    }
}

function refreshCurrentPagePrices() {
    const path = window.location.pathname;
    if (path.includes('shop.html') || path.includes('index.html') || path === '/') {
        displayProducts();
        return;
    }
    if (path.includes('product.html')) {
        loadProductDetails();
        return;
    }
    if (path.includes('cart.html')) {
        loadCartPage();
        return;
    }
    if (path.includes('checkout.html')) {
        if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
        if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
        return;
    }
    if (path.includes('account.html')) {
        if (typeof loadOrders === 'function') loadOrders();
    }
}

function setActiveCurrency(currencyCode, rate) {
    activeCurrencyCode = currencyCode || 'USD';
    usdToActiveRate = (typeof rate === 'number' && rate > 0) ? rate : 1;
    window.activeCurrencyCode = activeCurrencyCode;
    window.usdToActiveRate = usdToActiveRate;
    window.formatPrice = formatPrice;
    refreshCurrentPagePrices();
}

async function fetchUsdRates() {
    // Frankfurter rates are sourced from ECB reference rates.
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) throw new Error('Failed to fetch rates');
        const data = await response.json();
        const rates = data.rates || {};
        cachedUsdRates = { USD: 1, ...rates };
        // Add fallback rates for currencies not in the API
        cachedUsdRates = addFallbackCurrencyRates(cachedUsdRates);
        return cachedUsdRates;
    } catch (_err) {
        // Backup source for resilience on Safari/iOS network constraints
        try {
            const backup = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!backup.ok) throw new Error('Failed to fetch backup rates');
            const backupData = await backup.json();
            const rates = backupData.rates || {};
            cachedUsdRates = { USD: 1, ...rates };
            // Add fallback rates for currencies not in the API
            cachedUsdRates = addFallbackCurrencyRates(cachedUsdRates);
            return cachedUsdRates;
        } catch (backupErr) {
            // Both APIs failed, use fallback rates and default USD
            console.warn('Could not load currency rates from external APIs, using defaults', backupErr);
            cachedUsdRates = { USD: 1 };
            cachedUsdRates = addFallbackCurrencyRates(cachedUsdRates);
            return cachedUsdRates;
        }
    }
}

function addFallbackCurrencyRates(rates) {
    // Approximate rates for currencies that may not be in the API
    const fallbacks = {
        AFN: 70.5,      // Afghan Afghani
        BDT: 109.0,     // Bangladeshi Taka
        MVR: 15.4,      // Maldivian Rufiyaa
        NPR: 132.5,     // Nepalese Rupee
        PKR: 278.0,     // Pakistani Rupee
        LKR: 330.0,     // Sri Lankan Rupee
        GYD: 209.0,     // Guyanese Dollar
        SRD: 34.5       // Surinamese Dollar
    };
    
    const result = { ...rates };
    for (const [currency, rate] of Object.entries(fallbacks)) {
        if (!result[currency]) {
            result[currency] = rate;
        }
    }
    return result;
}

async function getCountryCodeFromIp() {
    // Try ipwho.is first (more generous rate limits)
    try {
        const response = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error('ipwho failed');
        const data = await response.json();
        const cc = data?.country_code;
        if (cc) {
            console.log('Detected country from IP (ipwho):', cc);
            return String(cc).toUpperCase();
        }
    } catch (_err) {
        console.log('IP geolocation failed, using locale fallback');
    }

    // If IP geolocation fails, fall back to OS/browser locale
    return getCountryCodeFromLocale();
}

async function getCountryCodeFromGps() {
    if (!navigator.geolocation) throw new Error('Geolocation not available');
    if (!isSecureGeoContext()) throw new Error('Geolocation requires secure context on this platform');

    const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
        });
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const reverseUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const response = await fetch(reverseUrl);
    if (!response.ok) throw new Error('Failed reverse geocode from GPS');
    const data = await response.json();
    return (data && data.countryCode) ? String(data.countryCode).toUpperCase() : null;
}

async function initializeCurrencyContext() {
    try {
        let countryCode = null;
        if (isLikelyMobileDevice()) {
            try {
                countryCode = await getCountryCodeFromGps();
            } catch (_gpsErr) {
                countryCode = await getCountryCodeFromIp();
            }
        } else {
            countryCode = await getCountryCodeFromIp();
        }

        if (!countryCode) {
            countryCode = getCountryCodeFromLocale();
        }

        detectedCountryCode = countryCode;
        const currencyCode = getCurrencyForCountry(countryCode);
        const rates = await fetchUsdRates();
        const rate = currencyCode === 'USD' ? 1 : parseFloat(rates[currencyCode] || 1);
        setActiveCurrency(currencyCode, rate);
        updateRegionSelectorFlagForDetected(countryCode);
    } catch (_err) {
        setActiveCurrency('USD', 1);
    }
}

function injectRegionSelector() {
    if (document.getElementById('region-selector') || document.getElementById('region-selector-mobile')) return;

    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile: Inject in breadcrumb area
        const breadcrumbs = document.querySelectorAll('.breadcrumb');
        if (breadcrumbs.length === 0) {
            // Home page on mobile - don't show region dropdown
            return;
        }

        const breadcrumb = breadcrumbs[0];
        const breadcrumbContent = breadcrumb.innerHTML;
        
        const select = document.createElement('select');
        select.id = 'region-selector-mobile';
        select.title = 'Choose your region';
        select.setAttribute('aria-label', 'Choose your region');

        select.innerHTML = REGION_OPTIONS.map(option => `
            <option value="${option.code}">${option.flag} ${option.label}</option>
        `).join('');

        select.value = selectedRegion;
        select.addEventListener('change', async function() {
            const nextRegion = select.value || 'AUTO';
            await applyRegionPreference(nextRegion, true);
        });

        breadcrumb.innerHTML = '';
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'breadcrumb-content';
        contentWrapper.innerHTML = breadcrumbContent;
        breadcrumb.appendChild(contentWrapper);
        breadcrumb.appendChild(select);
    } else {
        // Desktop: Inject in header icons
        injectToHeaderIcons();
    }
}

function injectToHeaderIcons() {
    const headerIcons = document.querySelector('.header-icons');
    if (!headerIcons) return;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.marginRight = '0.5rem';

    const select = document.createElement('select');
    select.id = 'region-selector';
    select.title = 'Choose your region';
    select.setAttribute('aria-label', 'Choose your region');
    select.style.height = '34px';
    select.style.border = '1px solid var(--border-color)';
    select.style.borderRadius = '6px';
    select.style.padding = '0 0.5rem';
    select.style.background = 'var(--white)';
    select.style.color = 'var(--text-dark)';
    select.style.fontSize = '0.85rem';
    select.style.maxWidth = '170px';

    select.innerHTML = REGION_OPTIONS.map(option => `
        <option value="${option.code}">${option.label}</option>
    `).join('');

    select.value = selectedRegion;
    select.addEventListener('change', async function() {
        const nextRegion = select.value || 'AUTO';
        await applyRegionPreference(nextRegion, true);
    });

    wrapper.appendChild(select);
    headerIcons.prepend(wrapper);
}

async function applyRegionPreference(regionCode, persist = false) {
    selectedRegion = regionCode || 'AUTO';

    if (persist) {
        saveRegionPreference(selectedRegion);
    }

    if (selectedRegion === 'AUTO') {
        detectedCountryCode = null; // Reset when switching back to AUTO
        await initializeCurrencyContext();
        return;
    }

    // Reset detected country when user manually selects a region
    detectedCountryCode = null;
    resetRegionSelectorFlag();

    const selected = REGION_OPTIONS.find(option => option.code === selectedRegion);
    const countryCode = selected?.countryCode;
    const currencyCode = getCurrencyForCountry(countryCode);

    let rates = cachedUsdRates;
    if (!rates || Object.keys(rates).length <= 1) {
        rates = await fetchUsdRates();
    }

    const rate = currencyCode === 'USD' ? 1 : parseFloat((rates && rates[currencyCode]) || 1);
    setActiveCurrency(currencyCode, rate);
}

function updateRegionSelectorFlagForDetected(countryCode) {
    // Find the region option that matches the detected country
    const matchedRegion = REGION_OPTIONS.find(option => option.countryCode === countryCode);
    if (!matchedRegion) return;

    // Update mobile selector if it exists
    const mobileSelector = document.getElementById('region-selector-mobile');
    if (mobileSelector) {
        // Create a custom option for the detected country at the top
        mobileSelector.innerHTML = `
            <option value="AUTO">${matchedRegion.flag} Auto (${matchedRegion.label})</option>
        ` + REGION_OPTIONS.map(option => `
            <option value="${option.code}">${option.flag} ${option.label}</option>
        `).join('');
        mobileSelector.value = 'AUTO';
        mobileSelector.title = `Auto-detected: ${matchedRegion.label}`;
    }

    // Update desktop selector if it exists
    const desktopSelector = document.getElementById('region-selector');
    if (desktopSelector) {
        desktopSelector.title = `Auto-detected: ${matchedRegion.label}`;
    }
}

function resetRegionSelectorFlag() {
    // Reset to original options when user manually selects a region
    const mobileSelector = document.getElementById('region-selector-mobile');
    if (mobileSelector) {
        mobileSelector.innerHTML = REGION_OPTIONS.map(option => `
            <option value="${option.code}">${option.flag} ${option.label}</option>
        `).join('');
        mobileSelector.title = 'Choose your region';
    }

    const desktopSelector = document.getElementById('region-selector');
    if (desktopSelector) {
        desktopSelector.title = 'Choose your region';
    }
}

async function initializeCurrencySystem() {
    try {
        selectedRegion = getSavedRegionPreference();
        injectRegionSelector();
        await applyRegionPreference(selectedRegion, false);

        const selector = document.getElementById('region-selector');
        const selectorMobile = document.getElementById('region-selector-mobile');
        if (selector) {
            selector.value = selectedRegion;
        }
        if (selectorMobile) {
            selectorMobile.value = selectedRegion;
        }
    } catch (err) {
        console.error('Error initializing currency system:', err);
        // Fallback to USD if initialization fails
        setActiveCurrency('USD', 1);
    }
}

window.formatPrice = formatPrice;
window.activeCurrencyCode = activeCurrencyCode;
window.usdToActiveRate = usdToActiveRate;

// ============================================================
// THEME MANAGEMENT
// ============================================================

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    // Check if user has a saved preference
    if (!savedTheme) {
        // No saved preference, detect from system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light', true);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentSaved = localStorage.getItem(THEME_STORAGE_KEY);
            // Only auto-update if user hasn't manually set a preference
            if (!currentSaved || currentSaved === 'auto') {
                applyTheme(e.matches ? 'dark' : 'light', true);
            }
        });
    } else {
        applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
    }
    
    injectThemeToggleButton();
}

function applyTheme(theme, isAuto = false) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    
    // Only save to localStorage if this is a manual choice (not auto-detected)
    if (!isAuto) {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
        themeToggle.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
        themeToggle.setAttribute('title', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        themeToggle.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

function toggleTheme() {
    triggerThemeToggleHaptics();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
}

function triggerThemeToggleHaptics() {
    // Native bridge support (iOS/macOS WebKit wrappers, if present)
    try {
        const handlers = window.webkit && window.webkit.messageHandlers;
        if (handlers) {
            if (handlers.hapticFeedback && typeof handlers.hapticFeedback.postMessage === 'function') {
                handlers.hapticFeedback.postMessage({ type: 'impact', style: 'light' });
                return;
            }
            if (handlers.haptics && typeof handlers.haptics.postMessage === 'function') {
                handlers.haptics.postMessage({ type: 'impact', style: 'light' });
                return;
            }
        }
    } catch (_err) {
        // ignore and continue to web fallback
    }

    // Web fallback (supported on many mobile browsers)
    try {
        if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(10);
        }
    } catch (_err) {
        // no-op
    }
}

function injectThemeToggleButton() {
    if (document.getElementById('theme-toggle-btn')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'icon-btn';
    toggleBtn.id = 'theme-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    toggleBtn.title = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    toggleBtn.setAttribute('aria-label', toggleBtn.title);
    
    // Append directly to body instead of header-icons
    document.body.appendChild(toggleBtn);
}

// ============================================================
// PRODUCT MANAGEMENT
// ============================================================

// Load products from JSON data
async function loadProducts() {
    // Show spinner if on shop page
    const loadingSpinner = document.getElementById('products-loading');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const noProductsMsg = document.getElementById('no-products');
    if (loadingSpinner && window.location.pathname.includes('shop.html')) {
        loadingSpinner.classList.remove('hidden');
        if (clearFiltersBtn) clearFiltersBtn.style.display = 'none';
        if (noProductsMsg) noProductsMsg.style.display = 'none';
    }
    
    try {
        // fetch from backend API; if this fails (CORS/insecure context),
        // fall back to sample data without redirecting the user.
        let response;
        try {
            response = await fetch('/api/products.php');
        } catch (e) {
            // network or security issue (e.g., insecure operation in some browsers)
            console.warn('Products fetch blocked or insecure, using sample products', e);
            products = getSampleProducts();
            console.log('Loaded sample products:', products.length);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            if (clearFiltersBtn) clearFiltersBtn.style.display = '';
            return;
        }

        if (response.status === 401) {
            // unauthorized — use sample products instead of leaving empty
            console.warn('Products API returned 401, using sample products');
            products = getSampleProducts();
            console.log('Loaded sample products:', products.length);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            if (clearFiltersBtn) clearFiltersBtn.style.display = '';
            return;
        }

        if (!response.ok) throw new Error('Failed to load products');
        const data = await response.json();
        products = data.data?.products || data.products || [];
        console.log('Loaded products from API:', products.length);
    } catch (error) {
        console.error('Error loading products:', error);
        // Use sample products if JSON fails
        products = getSampleProducts();
        console.log('Loaded sample products (error fallback):', products.length);
    } finally {
        // Always hide spinner when done
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
        if (clearFiltersBtn) {
            clearFiltersBtn.style.display = '';
        }
        // Note: no-products visibility is controlled by displayProducts()
    }
}

// Get sample products (fallback)
function getSampleProducts() {
    return [
        {
            id: 1,
            name: "Premium Cotton T-Shirt",
            category: "casual",
            gender: "male",
            price: 45.00,
            originalPrice: 65.00,
            description: "Comfortable and versatile cotton t-shirt",
            image: "tshirt-1.jpg",
            sizes: ["XS", "S", "M", "L", "XL", "XXL"],
            colors: ["Black", "White", "Navy"],
            rating: 4.5,
            reviews: 120,
            inStock: true,
            badge: "Sale"
        }
    ];
}

// ============================================================
// CART MANAGEMENT
// ============================================================

// Get user-specific storage key
function getUserStorageKey(key) {
    const userId = currentUser?.id || currentUser?.email || 'guest';
    return `${key}_${userId}`;
}

// Sync cart with server
async function syncCartWithServer() {
    if (!currentUser) return;
    
    const cartLoading = document.getElementById('cart-loading');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummary = document.querySelector('.cart-summary');
    
    // Only hide elements on the first request (before cartSyncCompleted)
    if (!cartSyncCompleted) {
        if (cartLoading) cartLoading.classList.remove('hidden');
        if (cartItemsContainer) cartItemsContainer.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'none';
    }
    
    try {
        const response = await fetch('/api/cart.php?action=get-cart', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (data.success && data.data.cart) {
            // Merge server cart with local cart (server wins for conflicts)
            cart = data.data.cart;
            const cartKey = getUserStorageKey('velvet-cart');
            localStorage.setItem(cartKey, JSON.stringify(cart));
            updateCartUI();
        }
    } catch (error) {
        console.log('Cart sync failed, using local data');
    } finally {
        // Mark that the first get-cart request has completed
        if (!cartSyncCompleted) {
            cartSyncCompleted = true;
            
            // After request completes, hide loading and call loadCartPage to properly show/hide elements
            if (cartLoading) cartLoading.classList.add('hidden');
            const path = window.location.pathname;
            if (path.includes('cart.html')) {
                loadCartPage();
            } else {
                // For other pages, just show the cart elements if they exist
                if (cartItemsContainer) cartItemsContainer.style.display = '';
                if (cartSummary) cartSummary.style.display = '';
            }
        }
        // After first sync, subsequent syncs don't hide/show elements
    }
}

// Save cart to server
async function saveCartToServer() {
    if (!currentUser) {
        console.log('saveCartToServer: No currentUser');
        return;
    }
    
    console.log('saveCartToServer: Saving cart for user', currentUser.id, 'Items:', cart.length);
    
    try {
        const response = await fetch('/api/cart.php?action=save-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart }),
            credentials: 'same-origin'
        });
        const data = await response.json();
        console.log('saveCartToServer: Response', data);
        if (!data.success) {
            console.error('saveCartToServer: Failed -', data.message);
        }
    } catch (error) {
        console.error('saveCartToServer: Exception', error);
    }
}

// Sync addresses with server
async function syncAddressesWithServer() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/cart.php?action=get-addresses', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (data.success && data.data.addresses) {
            const addressKey = getUserStorageKey('addresses');
            localStorage.setItem(addressKey, JSON.stringify(data.data.addresses));
            renderSavedAddresses();
        }
    } catch (error) {
        console.log('Address sync failed, using local data');
    }
}

// Save addresses to server
async function saveAddressesToServer() {
    if (!currentUser) return;
    
    try {
        const addresses = getSavedAddresses();
        await fetch('/api/cart.php?action=save-addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses }),
            credentials: 'same-origin'
        });
    } catch (error) {
        console.log('Failed to save addresses to server');
    }
}

// Load cart from localStorage
function loadCart() {
    const cartKey = getUserStorageKey('velvet-cart');
    const savedCart = localStorage.getItem(cartKey);
    cart = savedCart ? JSON.parse(savedCart) : [];
    updateCartUI();
    
    // Sync with server if logged in
    if (currentUser) {
        syncCartWithServer();
    }
}

// Save cart to localStorage
function saveCart() {
    const cartKey = getUserStorageKey('velvet-cart');
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartUI();
    // if we're currently viewing the cart page, refresh its contents
    // this makes the delete buttons and quantity controls feel responsive
    if (document.getElementById('cart-items-container')) {
        loadCartPage();
    }
    
    // Save to server if logged in
    console.log('saveCart: currentUser=', currentUser ? currentUser.id : 'null', 'cart items=', cart.length);
    if (currentUser) {
        saveCartToServer();
    }
}

// Add product to cart
function addToCart(productId, quantity = 1, size = null, color = null) {
    // Convert productId to string to match API response format
    const id = String(productId);
    const product = products.find(p => String(p.id) === id);
    
    if (!product) {
        console.error('Product not found. Looking for ID:', id, 'Available IDs:', products.map(p => p.id));
        alert('Product not found');
        return;
    }

    // Check if product already in cart with same size/color
    const existingItem = cart.find(item => 
        String(item.id) === id && item.size === size && item.color === color
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || 'default.jpg',
            quantity: quantity,
            size: size,
            color: color
        });
    }

    saveCart();
    showNotification('Product added to cart!', 'success');
}

// Remove item from cart
function removeFromCart(productId, size = null, color = null) {
    cart = cart.filter(item => 
        !(String(item.id) === String(productId) && item.size === size && item.color === color)
    );
    saveCart();
}

// Clear entire cart
function clearCart() {
    if (cart.length === 0) {
        showNotification('Your cart is already empty', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
        cart = [];
        saveCart();
        updateCartUI();
        loadCartPage();
        showNotification('Your cart has been cleared', 'success');
    }
}

// Update cart item quantity
function updateCartQuantity(productId, quantity, size = null, color = null) {
    const item = cart.find(item => 
        String(item.id) === String(productId) && item.size === size && item.color === color
    );
    if (item) {
        item.quantity = Math.max(1, quantity);
        saveCart();
        updateCartUI();
        displayCart();
    }
}

// Get cart total
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Update cart UI (badge count)
function updateCartUI() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(badge => {
        badge.textContent = cartCount;
        // Hide badge when cart is empty
        if (cartCount === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = '';
        }
    });
    
    // Update cart preview
    updateCartPreview();
}

// Inject cart preview dropdown
function injectCartPreview() {
    const cartBtn = document.getElementById('cart-btn');
    if (!cartBtn || document.getElementById('cart-preview')) return;
    
    const preview = document.createElement('div');
    preview.id = 'cart-preview';
    preview.className = 'cart-preview';
    cartBtn.appendChild(preview);
    
    updateCartPreview();
}

// Update cart preview content
function updateCartPreview() {
    const preview = document.getElementById('cart-preview');
    if (!preview) return;
    
    if (cart.length === 0) {
        preview.classList.add('cart-empty');
        return;
    }
    
    preview.classList.remove('cart-empty');
    
    const itemsHTML = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        
        return `
            <div class="cart-preview-item">
                <img src="assets/images/${product.image || 'placeholder.jpg'}" alt="${product.name}" class="cart-preview-image">
                <div class="cart-preview-details">
                    <div class="cart-preview-name">${product.name}</div>
                    <div class="cart-preview-info">
                        ${item.size ? `Size: ${item.size}` : ''}
                        ${item.size && item.color ? ' • ' : ''}
                        ${item.color ? `Color: ${item.color}` : ''}
                    </div>
                    <div class="cart-preview-info">Qty: ${item.quantity}</div>
                    <div class="cart-preview-price">${formatPrice(item.price * item.quantity)}</div>
                </div>
                <button class="cart-preview-item-delete" onclick="removeFromCartPreview('${item.id}', ${item.size ? `'${item.size}'` : 'null'}, ${item.color ? `'${item.color}'` : 'null'}); event.stopPropagation();" title="Remove item">×</button>
            </div>
        `;
    }).join('');
    
    const total = getCartTotal();
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    preview.innerHTML = `
        <div class="cart-preview-header">
            <span>Shopping Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})</span>
            <button class="cart-preview-clear" onclick="clearCartFromPreview(); event.stopPropagation();" title="Clear cart">Clear All</button>
        </div>
        <div class="cart-preview-items">${itemsHTML}</div>
        <div class="cart-preview-footer">
            <div class="cart-preview-total">
                <span>Total:</span>
                <span>${formatPrice(total)}</span>
            </div>
            <div class="cart-preview-actions">
                <button class="cart-preview-btn cart-preview-btn-view" onclick="window.location.href='/pages/cart.html'; event.stopPropagation();">View Cart</button>
                <button class="cart-preview-btn cart-preview-btn-checkout" onclick="window.location.href='/pages/checkout.html'; event.stopPropagation();">Checkout</button>
            </div>
        </div>
    `;
}

// Remove item from cart preview
function removeFromCartPreview(productId, size = null, color = null) {
    removeFromCart(productId, size, color);
    updateCartUI();
    showNotification('Item removed from cart', 'success');
}

// Clear cart from preview
function clearCartFromPreview() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your entire cart?')) {
        cart = [];
        saveCart();
        updateCartUI();
        showNotification('Cart cleared', 'success');
    }
}

// ============================================================
// PRODUCT FILTERING & SORTING
// ============================================================

// Get selected filter values
function getActiveFilters() {
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    const genderCheckboxes = document.querySelectorAll('input[name="gender"]:checked');
    const priceRadios = document.querySelectorAll('input[name="price"]');

    const category = Array.from(categoryRadios).find(r => r.checked)?.value || 'all';
    const genders = Array.from(genderCheckboxes).map(c => c.value);
    const price = Array.from(priceRadios).find(r => r.checked)?.value || 'all';

    return { category, genders, price };
}

// Check if product matches filters
function matchesFilters(product, filters) {
    // Category filter
    if (filters.category !== 'all' && product.category !== filters.category) {
        return false;
    }

    // Gender filter
    if (filters.genders.length > 0 && !filters.genders.includes(product.gender)) {
        return false;
    }

    // Price filter
    if (filters.price !== 'all') {
        const [min, max] = filters.price === '200+' 
            ? [200, Infinity]
            : filters.price.split('-').map(Number);
        if (product.price < min || product.price > max) {
            return false;
        }
    }

    return true;
}

// Filter and display products
function filterProducts() {
    const filters = getActiveFilters();
    const filtered = products.filter(p => matchesFilters(p, filters));
    displayProducts(filtered);
    updateProductCount(filtered.length);
}

// Sort products
function sortProducts(sortBy) {
    const filters = getActiveFilters();
    let filtered = products.filter(p => matchesFilters(p, filters));

    switch(sortBy) {
        case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'newest':
        default:
            filtered.reverse();
    }

    displayProducts(filtered);
}

// Clear all filters
function clearFilters() {
    document.querySelectorAll('input[name="category"]').forEach(r => {
        if (r.value === 'all') r.checked = true;
    });
    document.querySelectorAll('input[name="gender"]').forEach(c => c.checked = false);
    document.querySelectorAll('input[name="price"]').forEach(r => {
        if (r.value === 'all') r.checked = true;
    });
    filterProducts();
}

// ============================================================
// PRODUCT DISPLAY
// ============================================================

// Display products grid
function displayProducts(productsToDisplay = products) {
    console.log('displayProducts called with', productsToDisplay.length, 'products');
    const container = document.getElementById('products-container') || 
                     document.getElementById('new-arrivals') ||
                     document.getElementById('recommendations');
    
    console.log('Container found:', !!container);
    if (!container) return;

    // Hide loading spinner if present
    const loadingSpinner = document.getElementById('products-loading');
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }

    if (productsToDisplay.length === 0) {
        console.log('No products to display');
        container.innerHTML = '';
        if (document.getElementById('no-products')) {
            document.getElementById('no-products').style.display = 'block';
        }
        return;
    }

    if (document.getElementById('no-products')) {
        document.getElementById('no-products').style.display = 'none';
    }

    console.log('Rendering products...');
    container.innerHTML = productsToDisplay.map(product => createProductCard(product)).join('');
}

// Create product card HTML
function createProductCard(product) {
    const price = parseFloat(product.price) || 0;
    const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
    const discount = originalPrice 
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    return `
        <div class="product-card" onclick="viewProduct(${product.id})">
            <div class="product-image" style="position: relative;">
                <img src="assets/images/${product.image || 'placeholder.jpg'}" alt="${product.name}" style="width: 100%; height: 300px; object-fit: cover;">
                ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description.substring(0, 60)}...</p>
                <div class="product-rating">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</div>
                <div class="product-price">
                    <span class="price">${formatPrice(price)}</span>
                    ${originalPrice ? `<span class="price-original">${formatPrice(originalPrice)}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-add-cart" onclick="openProductOptionsModal(${product.id}); event.stopPropagation();">Add to Cart</button>
                    <button class="btn-wishlist" onclick="addToWishlist(${product.id}); event.stopPropagation();">♡</button>
                </div>
            </div>
        </div>
    `;
}

// Update product count display
function updateProductCount(count) {
    const element = document.getElementById('product-count');
    if (element) {
        element.textContent = `Showing ${count} product${count !== 1 ? 's' : ''}`;
    }
}

// ============================================================
// PRODUCT DETAIL PAGE
// ============================================================

// View product details
function viewProduct(productId) {
    sessionStorage.setItem('selectedProduct', productId);
    // use an absolute path so the link always resolves correctly
    // regardless of the current page location (avoids "/pages/pages/..." errors)
    window.location.href = '/pages/product.html';
}

// Load product details on product page
async function loadProductDetails() {
    const productId = parseInt(sessionStorage.getItem('selectedProduct')) || 1;
    console.log('Loading product details for ID:', productId);

    // make sure we have a products list; if not, try loading it first
    if (products.length === 0) {
        try {
            await loadProducts();
        } catch (_e) {
            // ignore; loadProducts already handles its own errors
        }
    }

    console.log('Available products:', products.length);

    let product = products.find(p => p.id === productId);

    // if not already present (e.g. direct link or filtered list), try fetching
    if (!product) {
        try {
            const resp = await fetch(`/api/products.php?id=${productId}`);
            if (resp.ok) {
                const data = await resp.json();
                product = data.data;
            }
        } catch (e) {
            console.warn('Could not load product details from API, falling back to samples:', e);
        }
    }

    // final fallback: use first sample product or one matching id
    if (!product) {
        const samples = getSampleProducts();
        product = samples.find(p => p.id === productId) || samples[0];
    }

    if (!product) {
        console.error('No product found!');
        return;
    }

    console.log('Product loaded:', product);

    // Normalize API response data structure
    // Convert string properties to appropriate types
    if (typeof product.price === 'string') {
        product.price = parseFloat(product.price);
    }
    if (typeof product.original_price === 'string') {
        product.originalPrice = parseFloat(product.original_price);
    } else if (!product.originalPrice && product.original_price) {
        product.originalPrice = product.original_price;
    }
    
    // Map API field names to expected property names
    if (product.image_url && !product.image) {
        product.image = product.image_url;
    }
    if (product.stock !== undefined && product.inStock === undefined) {
        product.inStock = parseInt(product.stock) > 0;
    }
    
    // Add default sizes and colors if not present
    if (!product.sizes || product.sizes.length === 0) {
        console.log('No sizes found, adding defaults');
        product.sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    }
    if (!product.colors || product.colors.length === 0) {
        console.log('No colors found, adding defaults');
        product.colors = ["Black", "White", "Navy"];
    }

    console.log('Product sizes:', product.sizes);
    console.log('Product colors:', product.colors);

    // Update page title and breadcrumb
    document.getElementById('breadcrumb-product').textContent = product.name;
    document.getElementById('product-category').textContent = product.category.toUpperCase();
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-price').textContent = formatPrice(product.price);
    document.getElementById('review-count').textContent = product.reviews || '0';
    document.getElementById('sku').textContent = product.sku ? `${product.sku}` : `VVSKU${String(product.id).padStart(4, '0')}`;
    
    // Rating
    const ratingElement = document.getElementById('product-rating');
    const rating = product.rating ? parseFloat(product.rating) : 4;
    ratingElement.textContent = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

    // Sizes
    const sizesContainer = document.getElementById('sizes');
    console.log('Sizes container element:', sizesContainer);
    if (sizesContainer) {
        const sizesHTML = product.sizes.map(size => `
        <label style="padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 4px; text-align: center; cursor: pointer; transition: all 0.3s ease;">
            <input type="radio" name="size" value="${size}" style="margin-right: 0.5rem;">
            ${size}
        </label>
    `).join('');
        console.log('Setting sizes HTML:', sizesHTML);
        sizesContainer.innerHTML = sizesHTML;
    } else {
        console.warn('Sizes container not found');
    }

    // Colors
    const colorMap = {
        'Black': '#000000',
        'White': '#FFFFFF',
        'Navy': '#001f3f',
        'Gray': '#808080',
        'Light Blue': '#ADD8E6',
        'Dark Blue': '#00008B',
        'Charcoal': '#36454F',
        'Brown': '#8B4513',
        'Tan': '#D2B48C',
        'Burgundy': '#800020',
        'Pink': '#FFC0CB',
        'Red': '#FF0000',
        'Khaki': '#F0E68C',
        'Cream': '#FFFDD0',
        'One Size': '#C0C0C0'
    };

    const colorsContainer = document.getElementById('colors');
    console.log('Colors container element:', colorsContainer);
    if (colorsContainer) {
        const colorsHTML = product.colors.map(color => `
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="radio" name="color" value="${color}" style="margin: 0;">
            <div style="width: 30px; height: 30px; background-color: ${colorMap[color] || '#999'}; border-radius: 50%; border: 2px solid #ddd;"></div>
            <span>${color}</span>
        </label>
    `).join('');
        console.log('Setting colors HTML:', colorsHTML);
        colorsContainer.innerHTML = colorsHTML;
    } else {
        console.warn('Colors container not found');
    }

    // Original price
    if (product.originalPrice) {
        const originalPrice = typeof product.originalPrice === 'string' ? parseFloat(product.originalPrice) : product.originalPrice;
        const priceElement = document.getElementById('original-price');
        priceElement.textContent = formatPrice(originalPrice);
        priceElement.style.display = 'inline';
    }

    // Stock status
    const availability = document.getElementById('availability');
    const isInStock = product.inStock === true || product.inStock === 'true' || (product.stock && parseInt(product.stock) > 0);
    availability.textContent = isInStock ? 'In Stock' : 'Out of Stock';
    availability.style.color = isInStock ? 'var(--success-color)' : 'var(--error-color)';

    // Load related products (same category, excluding current product)
    const relatedContainer = document.getElementById('related-products');
    if (relatedContainer) {
        const relatedProducts = products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4);
        
        if (relatedProducts.length > 0) {
            relatedContainer.innerHTML = relatedProducts.map(p => createProductCard(p)).join('');
        } else {
            // If no products in same category, show random products
            const randomProducts = products
                .filter(p => p.id !== product.id)
                .sort(() => Math.random() - 0.5)
                .slice(0, 4);
            relatedContainer.innerHTML = randomProducts.map(p => createProductCard(p)).join('');
        }
    }
}

// Increase/Decrease Quantity
function increaseQuantity() {
    const input = document.getElementById('quantity');
    input.value = parseInt(input.value) + 1;
}

function decreaseQuantity() {
    const input = document.getElementById('quantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

// Change product image
function changeImage(src) {
    document.getElementById('main-image').src = src;
}

// add to cart helper used on the standalone product details page
// we give it a distinct name so it doesn't overwrite the core cart function
function addToCartFromProductPage() {
    const productId = parseInt(sessionStorage.getItem('selectedProduct')) || 1;
    const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
    const sizeInput = document.querySelector('input[name="size"]:checked');
    const colorInput = document.querySelector('input[name="color"]:checked');
    
    const size = sizeInput ? sizeInput.value : null;
    const color = colorInput ? colorInput.value : null;

    // call the generic addToCart implementation defined earlier
    addToCart(productId, quantity, size, color);
}

// ============================================================
// CART PAGE
// ============================================================

// Load cart items on cart page
function loadCartPage() {
    const container = document.getElementById('cart-items-container');
    const emptyMessage = document.getElementById('empty-cart-message');
    const cartLoading = document.getElementById('cart-loading');

    // Only show content if cart sync has completed
    if (!cartSyncCompleted) {
        container.style.display = 'none';
        emptyMessage.style.display = 'none';
        document.querySelector('.cart-summary').style.display = 'none';
        if (cartLoading) cartLoading.style.display = '';
        return;
    }

    // After first get request completes, show the elements
    if (cartLoading) cartLoading.style.display = 'none';
    
    if (cart.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        document.querySelector('.cart-summary').style.display = 'none';
        return;
    }

    container.style.display = 'block';
    emptyMessage.style.display = 'none';
    document.querySelector('.cart-summary').style.display = 'block';

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-image" onclick="viewProduct('${item.id}')" style="cursor: pointer;">
                <img src="assets/images/${item.image || 'placeholder.jpg'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4 onclick="viewProduct('${item.id}')" style="cursor: pointer;">${item.name}</h4>
                <p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">
                    ${item.size ? `Size: ${item.size}` : ''} ${item.color ? `| Color: ${item.color}` : ''}
                </p>
                <p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">SKU: VVSKU${String(item.id).padStart(4, '0')}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button onclick="updateCartQuantity('${item.id}', ${item.quantity - 1}, ${item.size ? `'${item.size}'` : 'null'}, ${item.color ? `'${item.color}'` : 'null'})">−</button>
                    <input type="number" value="${item.quantity}" readonly>
                    <button onclick="updateCartQuantity('${item.id}', ${item.quantity + 1}, ${item.size ? `'${item.size}'` : 'null'}, ${item.color ? `'${item.color}'` : 'null'})">+</button>
                </div>
                <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
                <button class="btn-remove" onclick="removeFromCart('${item.id}', ${item.size ? `'${item.size}'` : 'null'}, ${item.color ? `'${item.color}'` : 'null'})">🗑</button>
            </div>
        </div>
    `).join('');

    updateCartSummary();
    displayRecommendations();
}

// Update cart summary
function updateCartSummary() {
    const subtotal = getCartTotal();
    const shippingCost = subtotal > 50 ? 0 : 10;
    const tax = subtotal * 0.10;
    const discount = parseFloat(sessionStorage.getItem('discount') || 0);
    const total = subtotal + shippingCost + tax - discount;

    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('shipping-cost').textContent = shippingCost === 0 ? 'Free' : formatPrice(shippingCost);
    document.getElementById('tax-cost').textContent = formatPrice(tax);
    document.getElementById('discount-cost').textContent = `-${formatPrice(discount)}`;
    document.getElementById('total').textContent = formatPrice(total);
}

// Apply coupon code
function applyCoupon() {
    const code = document.getElementById('coupon-code').value.toUpperCase();
    const coupon = COUPON_CODES[code];

    if (coupon) {
        const subtotal = getCartTotal();
        const discount = subtotal * coupon.discount;
        sessionStorage.setItem('discount', discount);
        sessionStorage.setItem('couponCode', code);
        updateCartSummary();
        showNotification(`Coupon applied! ${coupon.label} discount`, 'success');
        document.getElementById('coupon-code').value = '';
    } else {
        showNotification('Invalid coupon code', 'error');
    }
}

// Load account page with loading spinner
function loadAccountPage() {
    const accountLoading = document.getElementById('account-loading');
    const loginRegisterSection = document.getElementById('login-register-section');
    const profileSection = document.getElementById('user-profile-section');
    
    // Show loading spinner and hide content initially
    if (accountLoading) {
        accountLoading.style.display = '';
        accountLoading.classList.remove('hidden');
    }
    if (loginRegisterSection) loginRegisterSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    
    // After brief delay, hide spinner and show appropriate content
    setTimeout(() => {
        if (accountLoading) {
            accountLoading.style.display = 'none';
            accountLoading.classList.add('hidden');
        }
        
        // Show appropriate section based on login state
        if (currentUser && currentUser.id) {
            if (loginRegisterSection) loginRegisterSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'block';
            
            // Hide passkeys for OAuth-only users
            hidePasskeysForOAuthUsers();
        } else {
            if (loginRegisterSection) loginRegisterSection.style.display = 'block';
            if (profileSection) profileSection.style.display = 'none';
        }
    }, 300);
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Check if user is logged in
    if (!currentUser) {
        // Save current cart as pending checkout cart before showing login
        localStorage.setItem('pendingCheckoutCart', JSON.stringify(cart));
        localStorage.setItem('pendingCheckout', 'true');
        showLoginPrompt('Login Required');
        return;
    }
    
    // Redirect to checkout page
    window.location.href = '/pages/checkout.html';
}

// Display recommendations
function displayRecommendations() {
    const container = document.getElementById('recommendations');
    if (!container) return;

    const recommended = products
        .filter(p => !cart.find(c => c.id === p.id))
        .slice(0, 4);
    
    container.innerHTML = recommended.map(product => createProductCard(product)).join('');
}

// ============================================================
// STAY LOGGED IN DIALOG
// ============================================================

/**
 * Show dialog asking if user wants to stay logged in
 * @param {string} loginType - 'password' or 'passkey'
 * @param {Function} onYes - Callback when user selects Yes
 * @param {Function} onNo - Callback when user selects No
 */
function showStayLoggedInDialog(loginType, onYes, onNo) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
        color: var(--text-dark);
    `;
    title.textContent = loginType === 'passkey' ? '🔑 Stay Logged In?' : 'Stay Logged In?';

    const message = document.createElement('p');
    message.style.cssText = `
        margin: 0 0 1.5rem 0;
        color: var(--text-light);
        line-height: 1.5;
    `;
    message.textContent = loginType === 'passkey' 
        ? 'Would you like to stay logged in on this device? Your session will be saved for next time.'
        : 'Would you like to stay logged in on this device? You\'ll be automatically signed in next time you visit.';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 1rem;
    `;

    const noBtn = document.createElement('button');
    noBtn.style.cssText = `
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border-color);
        background: white;
        color: var(--text-dark);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    `;
    noBtn.textContent = 'Not Now';
    noBtn.onmouseover = () => noBtn.style.background = 'var(--light-bg)';
    noBtn.onmouseout = () => noBtn.style.background = 'white';
    noBtn.onclick = () => {
        overlay.remove();
        onNo();
    };

    const yesBtn = document.createElement('button');
    yesBtn.style.cssText = `
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--secondary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    `;
    yesBtn.textContent = 'Yes, Stay Logged In';
    yesBtn.onmouseover = () => yesBtn.style.opacity = '0.9';
    yesBtn.onmouseout = () => yesBtn.style.opacity = '1';
    yesBtn.onclick = () => {
        overlay.remove();
        onYes();
    };

    buttonContainer.appendChild(noBtn);
    buttonContainer.appendChild(yesBtn);

    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus the Yes button for accessibility
    yesBtn.focus();
}

// ============================================================
// USER AUTHENTICATION
// ============================================================

function verifyTwoFactorCode(challenge, code) {
    return fetch('/api/auth.php?action=verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, code }),
        credentials: 'same-origin'
    }).then(r => r.json());
}

function resendTwoFactorCode(challenge) {
    return fetch('/api/auth.php?action=resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge }),
        credentials: 'same-origin'
    }).then(r => r.json());
}

function handleTwoFactorLoginFlow(twoFactorData, email, pendingCheckout) {
    const challenge = twoFactorData?.challenge;
    const emailMasked = twoFactorData?.email_masked || email;

    if (!challenge) {
        showNotification('2FA challenge missing. Please try again.', 'error');
        return;
    }

    // Store context for 2FA modal
    window.currentTwoFAChallenge = challenge;
    window.currentTwoFAEmail = email;
    window.currentTwoFAPendingCheckout = pendingCheckout;

    // Show 2FA modal
    const modal = document.getElementById('twofa-modal-overlay');
    const emailMessage = document.getElementById('twofa-email-message');
    const codeInput = document.getElementById('twofa-code-input');
    const errorMessage = document.getElementById('twofa-error-message');

    if (modal) {
        emailMessage.textContent = `Enter the 6-digit verification code sent to ${emailMasked}`;
        codeInput.value = '';
        codeInput.focus();
        errorMessage.style.display = 'none';
        modal.style.display = 'flex';
    }
}

// Handle 2FA code submission from modal
function submitTwoFactorCode() {
    const codeInput = document.getElementById('twofa-code-input');
    const code = String(codeInput.value).trim();
    const errorMessage = document.getElementById('twofa-error-message');

    if (!code || !/^\d{6}$/.test(code)) {
        errorMessage.textContent = 'Please enter a valid 6-digit code';
        errorMessage.classList.add('show');
        return;
    }

    const challenge = window.currentTwoFAChallenge;
    const email = window.currentTwoFAEmail;
    const pendingCheckout = window.currentTwoFAPendingCheckout;

    verifyTwoFactorCode(challenge, code)
        .then(verifyData => {
            if (verifyData.success) {
                currentUser = normalizeCurrentUser({
                    ...verifyData.data,
                    email: verifyData.data?.email || email
                });

                closeTwoFactorModal();

                showStayLoggedInDialog('password',
                    () => {
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        completeLogin(pendingCheckout);
                    },
                    () => {
                        localStorage.removeItem('currentUser');
                        completeLogin(pendingCheckout);
                    }
                );
                return;
            }

            errorMessage.textContent = verifyData.message || 'Invalid verification code';
            errorMessage.classList.add('show');
        })
        .catch(() => {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.classList.add('show');
        });
}

// Handle 2FA code resend
function resendTwoFactorCodeFromModal() {
    const challenge = window.currentTwoFAChallenge;
    const emailMasked = document.getElementById('twofa-email-message').textContent;
    const errorMessage = document.getElementById('twofa-error-message');
    const codeInput = document.getElementById('twofa-code-input');

    resendTwoFactorCode(challenge)
        .then(resendData => {
            if (resendData.success) {
                showNotification('New verification code sent', 'success');
                codeInput.value = '';
                codeInput.focus();
                errorMessage.classList.remove('show');
            } else {
                errorMessage.textContent = resendData.message || 'Could not resend verification code';
                errorMessage.classList.add('show');
            }
        })
        .catch(() => {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.classList.add('show');
        });
}

// Close 2FA modal
function closeTwoFactorModal() {
    const modal = document.getElementById('twofa-modal-overlay');
    if (modal) {
        modal.style.display = 'none';
    }
    window.currentTwoFAChallenge = null;
    window.currentTwoFAEmail = null;
    window.currentTwoFAPendingCheckout = null;
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const pendingCheckout = localStorage.getItem('pendingCheckout') === 'true';

    fetch('/api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            if (data.data?.requires_2fa) {
                handleTwoFactorLoginFlow(data.data, email, pendingCheckout);
                return;
            }

            currentUser = normalizeCurrentUser({
                ...data.data,
                email: data.data?.email || email
            });
            
            // Show "stay logged in" dialog
            showStayLoggedInDialog('password',
                // User clicked "Yes, Stay Logged In"
                () => {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    completeLogin(pendingCheckout);
                },
                // User clicked "Not Now"
                () => {
                    localStorage.removeItem('currentUser');
                    completeLogin(pendingCheckout);
                }
            );
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    })
    .catch(() => showNotification('Network error', 'error'));
}

/**
 * Complete the login process after user decides about staying logged in
 */
function completeLogin(pendingCheckout) {
    loadCart(); // Reload user-specific cart
    
    // Merge pending checkout cart if it exists
    const pendingCart = localStorage.getItem('pendingCheckoutCart');
    if (pendingCart) {
        try {
            const pendingItems = JSON.parse(pendingCart);
            // Merge pending items into current cart
            pendingItems.forEach(pendingItem => {
                const existingItem = cart.find(item => 
                    String(item.id) === String(pendingItem.id) && 
                    item.size === pendingItem.size && 
                    item.color === pendingItem.color
                );
                if (existingItem) {
                    existingItem.quantity += pendingItem.quantity;
                } else {
                    cart.push(pendingItem);
                }
            });
            saveCart();
            syncCartWithServer();
            localStorage.removeItem('pendingCheckoutCart');
        } catch (e) {
            console.error('Failed to merge pending cart:', e);
        }
    }
    
    // Clear pending checkout flag
    localStorage.removeItem('pendingCheckout');
    
    showLoginSuccess();
    
    // Redirect to checkout page if this login was triggered by checkout attempt
    if (pendingCheckout) {
        setTimeout(() => {
            window.location.href = '/pages/checkout.html';
        }, 500);
    }
}

// Handle registration
function handleRegister(event) {
    event.preventDefault();
    const firstName = event.target.querySelector('input[placeholder="John"]').value;
    const lastName = event.target.querySelector('input[placeholder="Doe"]').value;
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    fetch('/api/auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password }),
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Check if 2FA is required (new registrations require 2FA)
            if (data.data?.requires_2fa) {
                handleTwoFactorLoginFlow(data.data, email);
            } else {
                currentUser = normalizeCurrentUser({
                    ...data.data,
                    first_name: firstName,
                    last_name: lastName,
                    name: `${firstName} ${lastName}`.trim(),
                    email
                });
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                loadCart(); // Reload user-specific cart
                showLoginSuccess();
            }
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    })
    .catch(() => showNotification('Network error', 'error'));
}

function getUserDisplayName(user) {
    if (!user) return '';
    if (user.name && String(user.name).trim()) return String(user.name).trim();

    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    return `${first} ${last}`.trim();
}

function normalizeCurrentUser(user) {
    if (!user) return null;

    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    const fallbackName = `${first} ${last}`.trim();

    return {
        ...user,
        first_name: first || (user.name || '').split(' ')[0] || '',
        last_name: last || (user.name || '').split(' ').slice(1).join(' ') || '',
        name: (user.name || fallbackName || '').trim(),
        email: user.email || '',
        phone: user.phone || ''
    };
}

function updateAccountInfoPanel() {
    if (!currentUser) return;

    const emailEl = document.getElementById('account-email');
    const phoneEl = document.getElementById('account-phone');
    const statusEl = document.getElementById('account-status');
    const memberSinceEl = document.getElementById('member-since-date');

    if (emailEl) emailEl.textContent = currentUser.email || '—';
    if (phoneEl) phoneEl.textContent = currentUser.phone || 'Not set';
    if (statusEl) {
        statusEl.textContent = 'Active';
        statusEl.style.color = 'var(--success-color)';
    }
    
    if (memberSinceEl && currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        const formatted = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long'
        });
        memberSinceEl.textContent = formatted;
    }
}

function syncCurrentUserFromServer() {
    return fetch('/api/auth.php?action=profile', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                currentUser = normalizeCurrentUser(data.data);
                
                // Only save to localStorage if user previously opted for "remember me"
                // (i.e., if currentUser was already in localStorage)
                const wasRemembered = localStorage.getItem('currentUser') !== null;
                if (wasRemembered) {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
                
                updateUserProfileHeader();
                checkAdminAccess();
                populateProfileForm();
                updateAccountInfoPanel();
                
                // Also refresh addresses if on addresses tab
                const addressesList = document.getElementById('addresses-list');
                if (addressesList) {
                    renderSavedAddresses();
                }
                
                return true; // Successfully synced
            }
            return false; // Sync failed
        })
        .catch(() => false);
}

function populateProfileForm() {
    if (!currentUser) return;

    const form = document.querySelector('#profile-tab form[onsubmit="updateProfile(event)"]');
    if (!form) return;

    const inputs = form.querySelectorAll('input.form-control');
    if (inputs.length < 4) return;

    const first = (currentUser.first_name || (currentUser.name || '').split(' ')[0] || '').trim();
    const last = (currentUser.last_name || (currentUser.name || '').split(' ').slice(1).join(' ') || '').trim();

    inputs[0].value = first;
    inputs[1].value = last;
    inputs[2].value = currentUser.email || '';
    inputs[3].value = currentUser.phone || '';
}

function updateUserProfileHeader() {
    const fullNameElement = document.getElementById('user-fullname');
    const avatarElement = document.getElementById('user-avatar');

    if (!fullNameElement || !avatarElement || !currentUser) return;

    const displayName = getUserDisplayName(currentUser) || 'User';
    fullNameElement.textContent = displayName;

    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    avatarElement.textContent = initials || 'U';
}

// Show login succes// Show login success
// OAuth Login Functions
async function loginWithGoogle() {
    try {
        const response = await fetch('/api/oauth-url.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                pending_checkout: localStorage.getItem('pendingCheckout') === 'true'
            }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success && data.data?.auth_url) {
            window.location.href = data.data.auth_url;
        } else {
            showNotification('Failed to initiate Google login', 'error');
        }
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Error initiating Google login', 'error');
    }
}

async function loginWithApple() {
    try {
        const response = await fetch('/api/oauth-url.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'apple',
                pending_checkout: localStorage.getItem('pendingCheckout') === 'true'
            }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success && data.data?.auth_url) {
            window.location.href = data.data.auth_url;
        } else {
            showNotification('Failed to initiate Apple login', 'error');
        }
    } catch (error) {
        console.error('Apple login error:', error);
        showNotification('Error initiating Apple login', 'error');
    }
}

function showLoginSuccess() {
    // 1. Check if the login/profile sections actually exist on this page
    const loginSection = document.getElementById('login-register-section');
    const profileSection = document.getElementById('user-profile-section');
    
    if (loginSection && profileSection) {
        loginSection.style.display = 'none';
        profileSection.style.display = 'block';
    }
    
    // 2. Safely update user info if the elements exist
    updateUserProfileHeader();
    populateProfileForm();
    updateAccountInfoPanel();
    
    // 3. Hide passkeys for OAuth-only users
    hidePasskeysForOAuthUsers();
    
    // 4. Check admin access and hide admin panel if not admin
    checkAdminAccess();
    
    // 5. Only show the notification if we are actually on the login page 
    // (prevents the popup from showing on every page load)
    if (loginSection) {
        showNotification('Login successful!', 'success');
    }
}

// Hide login success (for logout across tabs)
function hideLoginSuccess() {
    const loginSection = document.getElementById('login-register-section');
    const profileSection = document.getElementById('user-profile-section');
    
    if (loginSection && profileSection) {
        loginSection.style.display = 'block';
        profileSection.style.display = 'none';
    }
}

// Handle logout
function handleLogout() {
    // Call server-side logout to clear session
    fetch('/api/auth.php?action=logout', {
        method: 'POST',
        credentials: 'same-origin'
    }).catch(() => {});
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(cookie) {
        const name = cookie.split("=")[0].trim();
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname + ";";
    });
    
    localStorage.removeItem('currentUser');
    currentUser = null;
    cart = []; // Clear current cart
    loadCart(); // Load guest cart
    
    // Hide admin panel on logout
    checkAdminAccess();
    
    document.getElementById('user-profile-section').style.display = 'none';
    document.getElementById('login-register-section').style.display = 'block';
    showNotification('Logged out successfully', 'success');
}

// Switch to register tab
function switchToRegister() {
    event.preventDefault();
    const boxes = document.querySelectorAll('.account-box');
    boxes.forEach((box, index) => {
        box.style.display = index === 1 ? 'block' : 'none';
    });
}

// Handle OAuth login success callback
function handleOAuthLoginSuccess(provider) {
    // Get user data from cookies
    const userId = getCookie('user_id');
    const userEmail = getCookie('user_email');
    const userName = getCookie('user_name');
    const oauthProvider = getCookie('oauth_provider');
    
    if (userId && userEmail) {
        // Set current user
        currentUser = {
            id: parseInt(userId),
            email: userEmail,
            name: userName,
            first_name: userName.split(' ')[0],
            last_name: userName.split(' ').slice(1).join(' '),
            role: 'customer',
            oauth_provider: oauthProvider
        };
        
        // Save to localStorage (OAuth login = remember me by default)
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Show success notification
        showNotification(`Logged in with ${provider}!`, 'success');
        
        // Force show profile section after a small delay to ensure DOM is ready
        setTimeout(() => {
            showLoginSuccess();
        }, 100);
        
        // Clear OAuth callback from URL
        if (window.history.replaceState) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
}

// Helper function to get cookie value
function getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

// Hide passkey UI elements for OAuth-only users
function hidePasskeysForOAuthUsers() {
    // If user has an oauth_provider, they are OAuth-only and should not see passkey options
    if (currentUser && currentUser.oauth_provider) {
        const passkeySigninBtn = document.getElementById('passkey-signin-btn');
        const passkeysSection = document.getElementById('passkeys-section');
        const addPasskeyBtn = document.getElementById('add-passkey-btn');
        const passkeysList = document.getElementById('passkeys-list');
        
        if (passkeySigninBtn) passkeySigninBtn.style.display = 'none';
        if (passkeysSection) passkeysSection.style.display = 'none';
        if (addPasskeyBtn) addPasskeyBtn.style.display = 'none';
        if (passkeysList) passkeysList.style.display = 'none';
    }
}
// Load user data
function loadUserData() {
    // Debug: Log all cookies
    console.log('loadUserData: All cookies:', document.cookie);
    
    // First check for OAuth cookies (persistent login)
    const userId = getCookie('user_id');
    const userEmail = getCookie('user_email');
    const userName = getCookie('user_name');
    const oauthProvider = getCookie('oauth_provider');
    
    console.log('loadUserData: Checking cookies - userId=', userId, 'email=', userEmail, 'provider=', oauthProvider);
    
    if (userId && userEmail) {
        // Restore from OAuth cookies
        currentUser = {
            id: parseInt(userId),
            email: userEmail,
            name: userName,
            first_name: userName.split(' ')[0],
            last_name: userName.split(' ').slice(1).join(' '),
            role: 'customer',
            oauth_provider: oauthProvider
        };
        
        console.log('loadUserData: Set currentUser from OAuth cookies', currentUser);
        
        // Ensure it's in localStorage too
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoginSuccess();
        syncCurrentUserFromServer();
        return;
    }
    
    // Then check localStorage (remember me)
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        try {
            currentUser = normalizeCurrentUser(JSON.parse(saved));
            console.log('loadUserData: Set currentUser from localStorage', currentUser);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showLoginSuccess();
        } catch (_e) {
            localStorage.removeItem('currentUser');
            currentUser = null;
        }

        // Keep UI accurate with backend session/profile when available
        syncCurrentUserFromServer();
        return;
    }

    // If no saved user data, don't restore session from server
    // This ensures users without "remember me" are logged out on page refresh
    console.log('loadUserData: No saved user data found');
    currentUser = null;
}

// ============================================================
// CONTACT & FORM HANDLING
// ============================================================

// Handle contact form
function handleContactForm(event) {
    event.preventDefault();
    showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
    event.target.reset();
}

// Subscribe to newsletter
function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    showNotification('Successfully subscribed! Check your email for details.', 'success');
    event.target.reset();
}

// Submit review
function submitReview(event) {
    event.preventDefault();
    showNotification('Thank you for your review!', 'success');
    event.target.reset();
}

// Update profile
function updateProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    const inputs = event.target.querySelectorAll('input.form-control');
    if (inputs.length < 4) {
        showNotification('Profile form is incomplete', 'error');
        return;
    }

    const firstName = inputs[0].value.trim();
    const lastName = inputs[1].value.trim();
    const email = inputs[2].value.trim();
    const phone = inputs[3].value.trim();

    // Always update local UI/state first so Save Changes is immediately visible
    const fullName = `${firstName} ${lastName}`.trim();
    currentUser = {
        ...currentUser,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email || currentUser.email,
        name: fullName || currentUser.name
    };

    // Only save to localStorage if user opted for "remember me"
    const wasRemembered = localStorage.getItem('currentUser') !== null;
    if (wasRemembered) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    updateUserProfileHeader();
    populateProfileForm();
    updateAccountInfoPanel();

    fetch('/api/auth.php?action=profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            phone: phone
        }),
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (!data.success) {
            // Keep local changes; backend may be unauthenticated after server restart
            showNotification((data.message || 'Profile saved locally. Please log in again to sync server changes.'), 'error');
            return;
        }

        showNotification('Profile updated successfully!', 'success');
    })
    .catch(() => {
        showNotification('Profile saved locally (network issue while syncing)', 'success');
    });
}

function deleteAccount() {
    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    const confirmation = confirm(
        '⚠️ WARNING: This will permanently delete your account!\n\n' +
        'All your data including:\n' +
        '• Order history\n' +
        '• Saved addresses\n' +
        '• Passkeys\n' +
        '• Personal information\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you absolutely sure you want to delete your account?'
    );

    if (!confirmation) return;

    const doubleConfirm = confirm(
        'Last chance!\n\n' +
        'Type your email in the next prompt to confirm deletion.'
    );

    if (!doubleConfirm) return;

    const emailConfirm = prompt('Enter your email address to confirm deletion:');
    
    if (!emailConfirm || emailConfirm.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
        showNotification('Email does not match. Account deletion cancelled.', 'error');
        return;
    }

    // Show loading state
    showNotification('Deleting account...', 'info');

    fetch('/api/auth.php?action=delete', {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showNotification('Account deleted successfully', 'success');
            
            // Clear all user data
            currentUser = null;
            localStorage.removeItem('currentUser');
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showNotification(data.message || 'Failed to delete account', 'error');
        }
    })
    .catch(() => {
        showNotification('Network error. Please try again.', 'error');
    });
}

async function loadCountryStateData() {
    if (countryData.length && stateData.length) return;

    const countryUrl = 'https://cdn.jsdelivr.net/npm/country-state-city@3.2.1/lib/assets/country.json';
    const stateUrl = 'https://cdn.jsdelivr.net/npm/country-state-city@3.2.1/lib/assets/state.json';

    try {
        const [countriesResp, statesResp] = await Promise.all([
            fetch(countryUrl),
            fetch(stateUrl)
        ]);

        if (!countriesResp.ok || !statesResp.ok) {
            throw new Error('Failed to load external location dataset');
        }

        const [countries, states] = await Promise.all([
            countriesResp.json(),
            statesResp.json()
        ]);

        countryData = (countries || []).slice().sort((a, b) => a.name.localeCompare(b.name));
        stateData = states || [];
    } catch (err) {
        console.warn('Could not load country/state dataset:', err);
        countryData = [
            { name: 'United States', isoCode: 'US' },
            { name: 'Canada', isoCode: 'CA' },
            { name: 'United Kingdom', isoCode: 'GB' },
            { name: 'Australia', isoCode: 'AU' }
        ];
        stateData = [];
    }
}

function populateCountryDropdown() {
    const countrySelect = document.getElementById('shipping-country');
    if (!countrySelect) return;

    const previousValue = countrySelect.value;
    countrySelect.innerHTML = '<option value="">Select country...</option>';

    countryData.forEach(country => {
        const option = document.createElement('option');
        option.value = country.isoCode;
        option.textContent = country.name;
        countrySelect.appendChild(option);
    });

    countrySelect.value = previousValue || 'US';
}

function populateStateDropdown(countryCode) {
    const stateSelect = document.getElementById('shipping-state');
    if (!stateSelect) return;

    stateSelect.innerHTML = '<option value="">Select state/province...</option>';

    const matchedStates = stateData
        .filter(state => state.countryCode === countryCode)
        .sort((a, b) => a.name.localeCompare(b.name));

    if (!matchedStates.length) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'No state/province data available';
        stateSelect.appendChild(emptyOption);
        return;
    }

    matchedStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state.isoCode || state.name;
        option.textContent = state.name;
        stateSelect.appendChild(option);
    });
}

async function initShippingAddressForm() {
    const countrySelect = document.getElementById('shipping-country');
    const stateSelect = document.getElementById('shipping-state');
    if (!countrySelect || !stateSelect) return;

    await loadCountryStateData();
    populateCountryDropdown();
    populateStateDropdown(countrySelect.value);

    if (!countrySelect.dataset.bound) {
        countrySelect.addEventListener('change', function() {
            populateStateDropdown(this.value);
        });
        countrySelect.dataset.bound = 'true';
    }
}

function getSavedAddresses() {
    const addressKey = getUserStorageKey('addresses');
    return JSON.parse(localStorage.getItem(addressKey) || '[]');
}

function renderSavedAddresses() {
    const list = document.getElementById('addresses-list');
    if (!list) return;

    const addresses = getSavedAddresses();
    if (!addresses.length) {
        list.innerHTML = '<p style="color: var(--text-light);">No saved addresses yet.</p>';
        return;
    }

    list.innerHTML = addresses.map((addr, index) => `
        <div class="product-card" style="cursor: default; margin-bottom: 1rem; position: relative;">
            <div style="padding: 1rem 1.25rem;">
                <button 
                    class="delete-address-btn" 
                    data-index="${index}"
                    style="position: absolute; top: 0.75rem; right: 0.75rem; background: var(--error-color); color: white; border: none; padding: 0.35rem 0.65rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.8'"
                    onmouseout="this.style.opacity='1'"
                    title="Delete address"
                >
                    ✕ Delete
                </button>
                <p style="margin: 0 0 0.5rem 0; padding-right: 5rem;"><strong>${addr.line1}</strong></p>
                <p style="margin: 0.25rem 0; color: var(--text-light);">${addr.unit}${addr.line2 ? `, ${addr.line2}` : ''}</p>
                <p style="margin: 0.25rem 0; color: var(--text-light);">${addr.city}, ${addr.state} ${addr.postal}</p>
                <p style="margin: 0.25rem 0; color: var(--text-light);">${addr.countryName}</p>
            </div>
        </div>
    `).join('');

    // Attach delete event listeners
    const deleteButtons = list.querySelectorAll('.delete-address-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteAddress(index);
        });
    });
}

// Delete address
function deleteAddress(index) {
    const addresses = getSavedAddresses();
    if (index < 0 || index >= addresses.length) return;

    // Remove the address at the specified index
    addresses.splice(index, 1);
    
    // Save back to localStorage
    const addressKey = getUserStorageKey('addresses');
    localStorage.setItem(addressKey, JSON.stringify(addresses));
    
    // Re-render the list
    renderSavedAddresses();
    
    // Show confirmation
    showNotification('Address deleted successfully', 'success');
    
    // Save to server if logged in
    if (currentUser) {
        saveAddressesToServer();
    }
}

// Add new address
function addNewAddress(event) {
    event.preventDefault();

    const line1 = document.getElementById('shipping-address-line1')?.value.trim() || '';
    const unit = document.getElementById('shipping-unit-number')?.value.trim() || '';
    const line2 = document.getElementById('shipping-address-line2')?.value.trim() || '';
    const city = document.getElementById('shipping-city')?.value.trim() || '';
    const stateSelect = document.getElementById('shipping-state');
    const state = stateSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const postal = document.getElementById('shipping-postal')?.value.trim() || '';
    const countrySelect = document.getElementById('shipping-country');
    const countryCode = countrySelect?.value || '';
    const countryName = countrySelect?.selectedOptions?.[0]?.textContent?.trim() || '';

    if (!line1 || !unit || !city || !state || !postal || !countryCode) {
        showNotification('Please complete all required shipping address fields', 'error');
        return;
    }

    const addresses = getSavedAddresses();
    addresses.push({
        line1,
        unit,
        line2,
        city,
        state,
        postal,
        countryCode,
        countryName
    });

    const addressKey = getUserStorageKey('addresses');
    localStorage.setItem(addressKey, JSON.stringify(addresses));
    renderSavedAddresses();
    showNotification('Address added successfully!', 'success');
    event.target.reset();

    const countrySelectEl = document.getElementById('shipping-country');
    if (countrySelectEl) {
        countrySelectEl.value = 'US';
        populateStateDropdown('US');
    }
    
    // Save to server if logged in
    if (currentUser) {
        saveAddressesToServer();
    }
}

// Add new product (admin)
function addNewProduct(event) {
    event.preventDefault();
    showNotification('Product added successfully!', 'success');
    event.target.reset();
}

// ============================================================
// UI INTERACTIONS
// ============================================================

// Create product options modal
function createProductOptionsModal() {
    const modal = document.createElement('div');
    modal.id = 'product-options-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeProductOptionsModal()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="closeProductOptionsModal()">✕</button>
            <h3 id="modal-product-name">Select Options</h3>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Size *</label>
                    <div id="modal-sizes" class="size-options"></div>
                    <p class="error-message" id="size-error" style="display: none; color: var(--error-color); font-size: 0.85rem; margin-top: 0.5rem;">Please select a size</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Color *</label>
                    <div id="modal-colors" class="color-options"></div>
                    <p class="error-message" id="color-error" style="display: none; color: var(--error-color); font-size: 0.85rem; margin-top: 0.5rem;">Please select a color</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <div class="quantity-control">
                        <button onclick="decreaseModalQuantity()">−</button>
                        <input type="number" id="modal-quantity" value="1" min="1" readonly>
                        <button onclick="increaseModalQuantity()">+</button>
                    </div>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="confirmAddToCart()">Add to Cart</button>
        </div>
    `;
    document.body.appendChild(modal);
}

let currentProductForModal = null;

function openProductOptionsModal(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    currentProductForModal = product;

    // Create modal if it doesn't exist
    let modal = document.getElementById('product-options-modal');
    if (!modal) {
        createProductOptionsModal();
        modal = document.getElementById('product-options-modal');
    }

    // Populate modal with product data
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-quantity').value = 1;

    // Add default sizes and colors if not present
    const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ["XS", "S", "M", "L", "XL", "XXL"];
    const colors = product.colors && product.colors.length > 0 ? product.colors : ["Black", "White", "Navy"];

    // Populate sizes
    const sizesContainer = document.getElementById('modal-sizes');
    sizesContainer.innerHTML = sizes.map(size => `
        <label class="option-label">
            <input type="radio" name="modal-size" value="${size}">
            <span>${size}</span>
        </label>
    `).join('');

    // Populate colors
    const colorMap = {
        'Black': '#000000',
        'White': '#FFFFFF',
        'Navy': '#001f3f',
        'Gray': '#808080',
        'Light Blue': '#ADD8E6',
        'Dark Blue': '#00008B',
        'Charcoal': '#36454F',
        'Brown': '#8B4513',
        'Tan': '#D2B48C',
        'Burgundy': '#800020',
        'Pink': '#FFC0CB',
        'Red': '#FF0000',
        'Khaki': '#F0E68C',
        'Cream': '#FFFDD0'
    };

    const colorsContainer = document.getElementById('modal-colors');
    colorsContainer.innerHTML = colors.map(color => `
        <label class="color-option-label">
            <input type="radio" name="modal-color" value="${color}">
            <div class="color-swatch" style="background-color: ${colorMap[color] || '#999'};"></div>
            <span>${color}</span>
        </label>
    `).join('');

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeProductOptionsModal() {
    const modal = document.getElementById('product-options-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    // Reset error messages
    document.getElementById('size-error').style.display = 'none';
    document.getElementById('color-error').style.display = 'none';
}

function increaseModalQuantity() {
    const input = document.getElementById('modal-quantity');
    input.value = parseInt(input.value) + 1;
}

function decreaseModalQuantity() {
    const input = document.getElementById('modal-quantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function confirmAddToCart() {
    const sizeInput = document.querySelector('input[name="modal-size"]:checked');
    const colorInput = document.querySelector('input[name="modal-color"]:checked');
    const quantity = parseInt(document.getElementById('modal-quantity').value);

    // Validate selections
    let hasError = false;

    if (!sizeInput) {
        document.getElementById('size-error').style.display = 'block';
        hasError = true;
    } else {
        document.getElementById('size-error').style.display = 'none';
    }

    if (!colorInput) {
        document.getElementById('color-error').style.display = 'block';
        hasError = true;
    } else {
        document.getElementById('color-error').style.display = 'none';
    }

    if (hasError) return;

    // Add to cart with selections
    const size = sizeInput.value;
    const color = colorInput.value;
    addToCart(currentProductForModal.id, quantity, size, color);

    // Close modal
    closeProductOptionsModal();
}

// Setup event listeners
function setupEventListeners() {
    // 2FA Modal event listeners
    const twoFAModalClose = document.getElementById('twofa-modal-close');
    const twoFAVerifyBtn = document.getElementById('twofa-verify-btn');
    const twoFAResendBtn = document.getElementById('twofa-resend-btn');
    const twoFACodeInput = document.getElementById('twofa-code-input');
    const twoFAModalOverlay = document.getElementById('twofa-modal-overlay');

    if (twoFAModalClose) {
        twoFAModalClose.addEventListener('click', closeTwoFactorModal);
    }

    if (twoFAVerifyBtn) {
        twoFAVerifyBtn.addEventListener('click', submitTwoFactorCode);
    }

    if (twoFAResendBtn) {
        twoFAResendBtn.addEventListener('click', resendTwoFactorCodeFromModal);
    }

    if (twoFACodeInput) {
        twoFACodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitTwoFactorCode();
            }
        });
    }

    if (twoFAModalOverlay) {
        twoFAModalOverlay.addEventListener('click', function(e) {
            if (e.target === twoFAModalOverlay) {
                closeTwoFactorModal();
            }
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchBar.style.display = searchBar.style.display === 'none' ? 'block' : 'none';
            if (searchBar.style.display === 'block') {
                searchInput.focus();
            }
        });
    }

    // Account button
    const accountBtn = document.getElementById('account-btn');
    if (accountBtn) {
        // use absolute path so links work from any directory
        accountBtn.addEventListener('click', function() {
            window.location.href = '/pages/account.html';
        });
    }

    // Cart button
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        // Create and inject cart preview dropdown
        injectCartPreview();
        
        // absolute path to avoid '/pages/pages/cart.html' issue
        cartBtn.addEventListener('click', function() {
            window.location.href = '/pages/cart.html';
        });
    }

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const filtered = products.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query)
            );
            displayProducts(filtered);
        });
    }

    initShippingAddressForm();
    renderSavedAddresses();
}

// Show tab content
function showTab(tabName, evt) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.style.color = 'var(--text-light)';
        btn.style.borderBottomColor = 'transparent';
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Keep orders tab content fresh after placing a new order
    if (tabName === 'orders' && typeof window.loadOrders === 'function') {
        window.loadOrders();
    }

    // Load passkeys when profile tab is shown
    if (tabName === 'profile' && typeof window.loadPasskeysList === 'function' && typeof isWebAuthnSupported === 'function' && isWebAuthnSupported()) {
        // Wait a bit for currentUser to be loaded if needed
        setTimeout(() => {
            if (window.currentUser) {
                window.loadPasskeysList();
            }
        }, 100);
    }

    // Update button styling (evt may be undefined when called programmatically)
    const target = evt ? evt.target : document.querySelector(`.tab-button.active`);
    if (target) {
        target.style.color = 'var(--text-dark)';
        target.style.borderBottomColor = 'var(--secondary-color)';
    }
}

// Toggle accordion
function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const isOpen = content.style.display === 'block';
    
    document.querySelectorAll('.accordion-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.accordion-header span').forEach(s => s.textContent = '+');
    
    if (!isOpen) {
        content.style.display = 'block';
        header.querySelector('span').textContent = '−';
    }
}

// Add to wishlist
function addToWishlist(productId) {
    const wishlistKey = getUserStorageKey('wishlist');
    let wishlist = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
    if (!wishlist.includes(productId)) {
        wishlist.push(productId);
        localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
        showNotification('Added to wishlist!', 'success');
    } else {
        showNotification('Already in wishlist!', 'info');
    }
}

// ============================================================
// UTILITIES
// ============================================================

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '100px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '400px';
    notification.style.animation = 'slideIn 0.3s ease';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load current page specific functions
function loadCurrentPage() {
    const path = window.location.pathname;

    if (path.includes('shop.html')) {
        // Show loading spinner if products aren't loaded yet
        const loadingSpinner = document.getElementById('products-loading');
        if (loadingSpinner && products.length === 0) {
            loadingSpinner.classList.remove('hidden');
        }
        displayProducts();
    } else if (path.includes('product.html')) {
        loadProductDetails();
    } else if (path.includes('cart.html')) {
        loadCartPage();
    } else if (path.includes('account.html')) {
        // Show loading spinner and load account page
        loadAccountPage();
        checkAdminAccess();
    } else if (path.includes('index.html') || path === '/') {
        const newArrivals = document.getElementById('new-arrivals');
        const newArrivalsSpinner = document.getElementById('new-arrivals-loading');
        
        if (newArrivals) {
            const latest = products.slice(0, 6);
            newArrivals.innerHTML = latest.map(product => createProductCard(product)).join('');
            
            // Hide spinner after rendering
            if (newArrivalsSpinner) {
                newArrivalsSpinner.classList.add('hidden');
            }
        }
    }
}

// Check admin access and hide admin panel for non-admin users
function checkAdminAccess() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Find admin tab button and content
    const adminTabButtons = document.querySelectorAll('.tab-button');
    const adminTab = document.getElementById('admin-tab');
    
    adminTabButtons.forEach(button => {
        if (button.textContent.trim().includes('Admin Panel')) {
            if (!isAdmin) {
                button.style.display = 'none';
            } else {
                button.style.display = '';
            }
        }
    });
    
    // Hide admin tab content for non-admin users
    if (adminTab && !isAdmin) {
        adminTab.style.display = 'none';
    }
}

// Show login prompt modal
function showLoginPrompt(message) {
    const existingModal = document.getElementById('login-prompt-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'login-prompt-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; max-width: 400px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);">
            <h2 style="margin: 0 0 1rem 0; color: var(--primary-color, #2c1a3d);">
                ${message}
            </h2>
            <p style="color: var(--text-light, #666666); margin: 0 0 1.5rem 0;">You need to be logged in to access this page.</p>
            <div style="display: flex; gap: 0.5rem; justify-content: center;">
                <button onclick="this.closest('#login-prompt-modal').remove()" style="padding: 0.75rem 1.5rem; background: var(--text-light, #666666); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Continue Browsing</button>
                <button onclick="window.location.href='/pages/account.html';" style="padding: 0.75rem 1.5rem; background: var(--primary-color, #2c1a3d); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Go to Login</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Hamburger Menu Toggle
const hamburger = document.getElementById('hamburger-menu');
const menu = document.getElementById('mobile-menu');
const overlay = document.getElementById('mobile-menu-overlay');
const closeBtn = document.getElementById('mobile-menu-close');

if (hamburger && menu && overlay) {
    function toggleMenu() {
        hamburger.classList.toggle('active');
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('mobile-menu-open');
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);
    
    // Close button handler
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    // Close menu when a link is clicked
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', function() {
            closeMenu();
        });
    });
}

// ============================================================
// CREDIT CARD VALIDATION
// ============================================================

function detectCardType() {
    const cardInput = document.getElementById('card-number');
    const cardIcon = document.getElementById('card-type-icon');
    const validationMsg = document.getElementById('card-validation-message');
    
    if (!cardInput || !cardIcon || !validationMsg) return;
    
    // Get card number and remove spaces
    let cardNumber = cardInput.value.replace(/\s/g, '');
    
    // Format card number with spaces (4 digits per section)
    let formattedNumber = cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
    cardInput.value = formattedNumber;
    
    // Detect card type based on first digits
    let cardType = null;
    let expectedLength = 16;
    let cardLogoUrl = '';
    
    if (!cardNumber) {
        cardIcon.style.opacity = '0';
        cardIcon.innerHTML = '';
        validationMsg.textContent = '';
        validationMsg.style.color = 'var(--text-light)';
        return;
    }
    
    // Visa: starts with 4, length 16
    if (/^4[0-9]{0,}/.test(cardNumber)) {
        cardType = 'Visa';
        expectedLength = 16;
        cardLogoUrl = '/assets/images/visa.png';
    }
    // Mastercard: starts with 5[1-5] or 2[2-7], length 16
    else if (/^(5[1-5]|2[2-7])[0-9]{0,}/.test(cardNumber)) {
        cardType = 'Mastercard';
        expectedLength = 16;
        cardLogoUrl = '/assets/images/mastercard.svg';
    }
    // American Express: starts with 34 or 37, length 15
    else if (/^3[47][0-9]{0,}/.test(cardNumber)) {
        cardType = 'American Express';
        expectedLength = 15;
        cardLogoUrl = '/assets/images/amex.svg';
    }
    // Discover: starts with 6, length 16
    else if (/^6[0-9]{0,}/.test(cardNumber)) {
        cardType = 'Discover';
        expectedLength = 16;
        cardLogoUrl = '/assets/images/discover.svg';
    }
    
    // Update card type icon with logo image
    if (cardType) {
        const img = document.createElement('img');
        img.src = cardLogoUrl;
        img.alt = cardType + ' logo';
        img.style.maxHeight = '40px';
        img.style.maxWidth = '60px';
        img.style.objectFit = 'contain';
        cardIcon.innerHTML = '';
        cardIcon.appendChild(img);
        cardIcon.style.opacity = '1';
        cardIcon.classList.add('card-flip');
        // Remove animation class after it completes
        setTimeout(() => {
            cardIcon.classList.remove('card-flip');
        }, 500);
    } else {
        cardIcon.style.opacity = '0';
        cardIcon.innerHTML = '';
    }
    
    // Validate card length
    if (cardNumber.length === expectedLength) {
        validationMsg.textContent = `✓ Valid ${cardType} card (${expectedLength} digits)`;
        validationMsg.style.color = 'var(--success-color)';
    } else if (cardNumber.length < expectedLength) {
        if (cardType) {
            validationMsg.textContent = `${cardType} requires ${expectedLength} digits (${cardNumber.length}/${expectedLength})`;
            validationMsg.style.color = 'var(--text-light)';
        } else {
            validationMsg.textContent = '';
            validationMsg.style.color = 'var(--text-light)';
        }
    } else {
        validationMsg.textContent = `✗ Card number too long (${cardNumber.length} digits)`;
        validationMsg.style.color = 'var(--error-color)';
    }
}

// Filter Toggle Button for Mobile
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filtersContainer = document.getElementById('filters-container');

if (filterToggleBtn && filtersContainer) {
    // Initialize filters as expanded
    filtersContainer.classList.remove('collapsed');
    
    filterToggleBtn.addEventListener('click', function() {
        filterToggleBtn.classList.toggle('active');
        filtersContainer.classList.toggle('collapsed');
    });
}

console.log('Velvet Vogue - JavaScript loaded successfully');
