# Velvet Vogue - Dual Version Architecture

## Overview

The Velvet Vogue web application now exists in **two distinct versions**, each optimized for its target platform:

1. **Desktop Version** (`/desktop/`) - Optimized for large screens
2. **Mobile Version** (`/mobile/`) - Optimized for phones and small screens

Users are automatically routed to the appropriate version based on their device type.

---

## Directory Structure

```
velvetvogue/
├── device-router.html          # Entry point - detects device and redirects
├── desktop/                     # Desktop-optimized version
│   ├── index.html              # Desktop home page
│   ├── pages/                  # Desktop pages (shop, product, etc.)
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
├── mobile/                      # Mobile-optimized version
│   ├── index.html              # Mobile home page
│   ├── pages/                  # Mobile pages (shop, product, etc.)
│   ├── assets/
│   │   ├── css/
│   │   │   └── mobile.css      # Mobile-specific CSS
│   │   ├── js/
│   │   │   └── mobile.js       # Mobile-specific JS
│   │   └── images/
└── assets/                      # Shared assets
    ├── css/
    ├── js/
    └── images/
```

---

## Device Detection & Routing

### Entry Point: `/device-router.html`

The application uses intelligent device detection to route users:

```javascript
// Detects:
// 1. User Agent (mobile OS: iOS, Android, etc.)
// 2. Screen size (< 768px = mobile)
// 3. Tablet detection (handles iPads appropriately)

if ((isMobile || isSmallScreen) && !isTablet) {
    window.location.href = '/mobile/index.html';
} else {
    window.location.href = '/desktop/index.html';
}
```

### Routing Logic

| Device Type | Screen Size | Route |
|------------|-------------|-------|
| iPhone | < 600px | `/mobile/` |
| Android Phone | < 600px | `/mobile/` |
| iPad | 768px+ | `/desktop/` |
| Tablet | 768px+ | `/desktop/` |
| Desktop | 1024px+ | `/desktop/` |
| Laptop | 1920px+ | `/desktop/` |

---

## Desktop Version Features

**Location:** `/desktop/`

### Optimizations
- **Multi-column product grid**: 4+ products per row (220px minmax)
- **Wide navigation bar**: Full horizontal menu
- **Large hero section**: Immersive visual experience
- **Hover effects**: Interactive product cards
- **Sidebar filters**: Product filtering alongside grid
- **Multiple content sections**: Featured, new arrivals, etc.

### Responsive Breakpoints
- **1920px+**: 8-9 products per row
- **1024px-1920px**: 5 products per row
- **768px-1024px**: 2 products per row
- **640px-768px**: 2 products per row

### Key Files
- `desktop/index.html` - Main landing page
- `desktop/pages/shop.html` - Desktop shop page
- `assets/css/style.css` - Shared desktop CSS (1,938 lines)
- `assets/js/main.js` - Shared functionality

---

## Mobile Version Features

**Location:** `/mobile/`

### Optimizations
- **Bottom tab navigation**: Thumb-friendly navigation
- **Hamburger menu**: Space-efficient navigation
- **Compact product cards**: 2-column grid on mobile
- **Sticky header**: Always accessible navigation
- **Touch-optimized buttons**: 44px minimum touch targets
- **Search overlay**: Full-screen search interface
- **Streamlined footer**: Minimal information

### Layout Structure
```
┌─────────────────────┐
│  Header (sticky)    │  ← Fixed at top
├─────────────────────┤
│    Hero Section     │
├─────────────────────┤
│   Product Grid      │  ← 2-column on mobile
│   (scrollable)      │
├─────────────────────┤
│   Product Grid      │
├─────────────────────┤
│      Footer         │
├─────────────────────┤
│ Bottom Navigation   │  ← Fixed at bottom
│  (Home/Shop/...)    │
└─────────────────────┘
```

### Key Components
- **Sticky Header**: Quick access to menu & search
- **Hamburger Menu**: Navigation drawer
- **Bottom Navigation Tab Bar**: 5 main actions
- **2-Column Product Grid**: Optimal mobile spacing
- **Full-Width Buttons**: Easy to tap
- **Floating Cart Badge**: Shows item count

### Key Files
- `mobile/index.html` - Mobile landing page
- `mobile/assets/css/mobile.css` - Mobile-specific CSS
- `mobile/assets/js/mobile.js` - Mobile-specific interactions
- `assets/js/main.js` - Shared functionality

---

## Comparison: Desktop vs Mobile

### Product Display

**Desktop**
```
┌──────┬──────┬──────┬──────┬──────┐
│Prod 1│Prod 2│Prod 3│Prod 4│Prod 5│
├──────┴──────┴──────┴──────┴──────┤
│          Product Details          │
│              (Large)              │
└───────────────────────────────────┘
```

**Mobile**
```
┌────────┬────────┐
│Prod 1  │Prod 2  │
├────────┼────────┤
│Prod 3  │Prod 4  │
└────────┴────────┘
(Compact cards, swipeable)
```

### Navigation

**Desktop**
- Horizontal top menu bar
- Inline search
- Sidebar filters
- Cart icon in header

**Mobile**
- Hamburger menu (left drawer)
- Bottom tab navigation (5 icons)
- Full-screen search overlay
- Cart access from bottom nav

### Touch Targets

**Both Versions**
- Minimum 44px × 44px for buttons
- 40px × 40px for input fields
- Adequate spacing between interactive elements

---

## Shared Assets

Both versions can access shared resources:

```
/assets/
├── css/style.css        # Desktop CSS
├── css/dark-theme.css   # Dark mode styles
├── js/main.js          # Core functionality
├── js/passkeys.js      # Authentication
├── api/                # Backend APIs
├── data/               # Static data
└── images/             # Product images
```

### Symlink or Copy Strategy
- Shared JavaScript files are referenced from root `/assets/js/`
- Mobile CSS is separate (`mobile/assets/css/mobile.css`)
- Images can be shared or cached for mobile optimization

---

## Theme Support

### Dark Mode
Both versions support dark mode with system preference detection:

```javascript
// Light mode meta tag
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">

// Dark mode meta tag
<meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)">
```

### Safari Compatibility
- Address bar color matches theme
- Automatic theme switching based on device settings

---

## User Experience Flows

### Mobile User Flow

1. **Enter site** → `device-router.html`
2. **Device detected** → Redirect to `/mobile/index.html`
3. **Browse homepage** → 2-column product grid
4. **Search (optional)** → Tap search in bottom nav
5. **Shop** → Tap shop in bottom nav
6. **View product** → Tap card to see details
7. **Add to cart** → Cart updated with bottom nav badge
8. **Checkout** → Optimized mobile checkout flow

### Desktop User Flow

1. **Enter site** → `device-router.html`
2. **Device detected** → Redirect to `/desktop/index.html`
3. **Browse homepage** → 4-8 column product grid
4. **Search (optional)** → Use inline search bar
5. **Shop** → Click shop in top menu
6. **Filter products** → Use sidebar filters
7. **View product** → Click card for details
8. **Add to cart** → Cart count updates in header
9. **Checkout** → Full-width checkout interface

---

## Version Switching

Users can manually switch between versions:

### From Mobile → Desktop
- Footer link: "Desktop Version"
- Navigates to `/device-router.html` with override

### From Desktop → Mobile
- Footer link: "Switch to Mobile Version"
- Navigates to `/device-router.html` with override

---

## API & Backend Integration

Both versions use the same backend:
- `/api/` endpoints
- `/api/auth.php` - Authentication
- `/api/products.php` - Product data
- `/api/cart.php` - Shopping cart
- `/api/passkeys.php` - Passkey authentication

No version-specific API changes needed.

---

## Development Guidelines

### Adding New Features

1. **Core Functionality**: Add to `/assets/js/main.js`
2. **Desktop UI**: Update `/desktop/pages/` and `/assets/css/style.css`
3. **Mobile UI**: Update `/mobile/pages/` and `/mobile/assets/css/mobile.css`
4. **Mobile Interactions**: Add to `/mobile/assets/js/mobile.js`

### Testing Both Versions

```bash
# Desktop version (1024px+)
# Open: http://localhost:8000/device-router.html

# Mobile version (< 768px)
# Open DevTools → Toggle Device Toolbar → Select iPhone
# Open: http://localhost:8000/device-router.html

# Direct access (testing)
# Desktop: http://localhost:8000/desktop/
# Mobile: http://localhost:8000/mobile/
```

### Browser DevTools Testing

1. **Chrome/Firefox/Safari**: Press `F12` → DevTools
2. **Toggle Device Toolbar**: `Ctrl+Shift+M` or `Cmd+Shift+M`
3. **Select Device**: 
   - iPhone 12/13/14/15/17 Pro
   - iPad Air
   - Desktop (1920px)
4. **Test navigation** and interactions

---

## Performance Optimizations

### Mobile Version
- Smaller hero section (saves bandwidth)
- 2-column grid instead of 8 (faster rendering)
- Minimal animations (better battery life)
- Touch-optimized (no hover effects)
- Sticky header with scroll hide (full screen space)

### Desktop Version
- Multi-column grid (better use of space)
- Hover effects (richer interaction)
- Sidebar filters (advanced filtering)
- Large hero section (immersive)
- Full featured layout

---

## Future Enhancements

### Mobile App Version (Optional)
```
- React Native or Flutter wrapper
- Push notifications
- Offline functionality
- App-specific navigation
```

### Progressive Web App (PWA)
```
- Service workers for offline
- Add to home screen
- Native-like experience
- Works on both versions
```

### Analytics
```
- Track version usage
- Monitor performance per version
- Optimize based on user data
```

---

## Summary

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| **Location** | `/desktop/` | `/mobile/` |
| **Target Screen** | 768px+ | < 768px |
| **Product Grid** | 4-8 columns | 2 columns |
| **Navigation** | Top menu | Bottom tabs + drawer |
| **Header** | Standard | Sticky |
| **Filters** | Sidebar | Mobile-friendly |
| **Touch Targets** | Standard | 44px minimum |
| **Hero Section** | Large | Compact |
| **Key Advantage** | Maximum information | Maximum usability |

---

**Last Updated:** March 4, 2026
**Version:** 1.0 - Dual Architecture
**Status:** Fully Implemented
