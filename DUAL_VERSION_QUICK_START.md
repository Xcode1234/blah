# Quick Start - Dual Version Implementation

## What's New

Velvet Vogue now has **two distinct versions**:
- **Desktop** (`/desktop/`) - Full-featured, multi-column layout
- **Mobile** (`/mobile/`) - Optimized for phones, bottom navigation

---

## How It Works

### User Visits Site
1. User navigates to `http://localhost:8000/device-router.html`
2. Browser detects device type and screen size
3. Automatically redirects to appropriate version:
   - **Phones (< 768px)** → `/mobile/index.html`
   - **Tablets & Desktop (768px+)** → `/desktop/index.html`

### File Organization

```
velvetvogue/
├── device-router.html          ← Entry point for all users
├── desktop/                     ← Desktop-optimized version
│   ├── index.html              ✓ Home page
│   └── pages/                  ✓ Shop, product, cart, etc.
├── mobile/                      ← Mobile-optimized version
│   ├── index.html              ✓ Home page
│   ├── pages/                  ✓ Shop, product, cart, etc.
│   └── assets/
│       ├── css/mobile.css       ✓ Mobile-specific CSS
│       └── js/mobile.js         ✓ Mobile-specific interactions
└── assets/                      ← Shared across both versions
    ├── css/style.css           ✓ Desktop CSS
    ├── js/main.js              ✓ Core functionality
    └── api/                    ✓ Backend APIs
```

---

## Testing Both Versions

### Method 1: Device Detection (Automatic)
```
1. Go to http://localhost:8000/device-router.html
2. It will automatically detect and redirect you
```

### Method 2: Direct Access (Manual Testing)
```
Desktop version: http://localhost:8000/desktop/
Mobile version:  http://localhost:8000/mobile/
```

### Method 3: Chrome DevTools Simulation
```
1. Open http://localhost:8000/device-router.html
2. Press F12 to open DevTools
3. Click device toggle icon (top left of DevTools)
4. Select iPhone or Android
5. Refresh page - should redirect to /mobile/
6. Select Desktop device
7. Refresh page - should redirect to /desktop/
```

---

## Key Differences

### Desktop Version
- ✅ 4-8 products per row
- ✅ Top horizontal navigation
- ✅ Full sidebar filters
- ✅ Hover effects
- ✅ Large hero section

### Mobile Version
- ✅ 2 products per row
- ✅ Bottom tab navigation (5 buttons)
- ✅ Hamburger menu drawer
- ✅ Touch-optimized (no hover)
- ✅ Compact everything
- ✅ Sticky header

---

## Current Implementation Status

✅ **Completed:**
- Device detection router
- Desktop version (uses existing structure)
- Mobile version with:
  - Mobile-specific HTML layouts
  - Mobile-specific CSS (`mobile.css`)
  - Mobile-specific JavaScript (`mobile.js`)
  - Bottom tab navigation
  - Hamburger menu
  - Responsive product grid
  - Dark mode support
  - Safari compatibility

✅ **Ready to Complete:**
- Copy existing pages to both `/desktop/pages/` and `/mobile/pages/`
- Update page links to use relative paths correctly
- Test each page on both versions

---

## Next Steps to Fully Deploy

### 1. Desktop Pages
Copy pages to `/desktop/pages/`:
```bash
cd /home/chandupha/Documents/wdd/velvetvogue
cp pages/*.html desktop/pages/
# Update relative paths in each file
```

### 2. Mobile Pages
Copy pages to `/mobile/pages/`:
```bash
cd /home/chandupha/Documents/wdd/velvetvogue
cp pages/*.html mobile/pages/
# Update for mobile layout and styling
```

### 3. Update Landing Page
Make sure root index.html redirects:
```html
<!-- Option A: Redirect -->
<meta http-equiv="refresh" content="0; url=device-router.html">

<!-- Option B: JavaScript redirect -->
<script>window.location = 'device-router.html';</script>
```

### 4. CSS Symlinks (Optional)
For desktop version, you can use symlinks to shared CSS:
```bash
ln -s ../../assets/css desktop/assets/css
ln -s ../../assets/js desktop/assets/js
ln -s ../../assets/images desktop/assets/images
```

For mobile, CSS is separate:
```
mobile/assets/css/mobile.css  ← Custom mobile CSS
mobile/assets/js/mobile.js    ← Custom mobile interactions
```

---

## Testing Checklist

### Desktop Version
- [ ] Load `/desktop/` on desktop (1920px)
- [ ] Product grid shows 8+ products per row
- [ ] Top menu navigation works
- [ ] Hover effects visible
- [ ] Sidebar filters visible
- [ ] Dark mode works
- [ ] All pages load correctly

### Mobile Version
- [ ] Load `/mobile/` on phone (< 600px)
- [ ] Product grid shows 2 products per row
- [ ] Bottom tab navigation visible
- [ ] Hamburger menu works
- [ ] No hover effects on cards
- [ ] Dark mode works
- [ ] All pages load correctly
- [ ] Touch targets are 44px+

### Device Detection
- [ ] `/device-router.html` on desktop → redirects to `/desktop/`
- [ ] `/device-router.html` on mobile → redirects to `/mobile/`
- [ ] Device switching works (DevTools toggle)

---

## File Structure Reference

```
DESKTOP VERSION
✓ Location: /desktop/
✓ Entry: http://localhost:8000/desktop/index.html
✓ CSS: /assets/css/style.css
✓ JS: /assets/js/main.js
✓ Pages: /desktop/pages/shop.html, product.html, etc.

MOBILE VERSION
✓ Location: /mobile/
✓ Entry: http://localhost:8000/mobile/index.html
✓ CSS: /mobile/assets/css/mobile.css
✓ JS: /mobile/assets/js/mobile.js
         /assets/js/main.js (shared)
✓ Pages: /mobile/pages/shop.html, product.html, etc.

SHARED ASSETS
✓ Location: /assets/
✓ Used by: Both desktop and mobile
✓ Includes: API, images, shared libraries
```

---

## Accessing the Versions

### From Root Domain
```
http://localhost:8000/device-router.html
↓
Detects device → Redirects to appropriate version
```

### Direct Access
```
http://localhost:8000/desktop/          → Always desktop
http://localhost:8000/mobile/           → Always mobile
```

### Version Switcher (Footer)
```
Mobile version has: "Desktop Version" link
Desktop version has: "Switch to Mobile Version" link
Both redirect to device-router.html
```

---

## Dark Mode Support

Both versions support dark mode with system preference:

**Light Mode:**
- White background (#ffffff)
- Dark text (#2c2c2c)

**Dark Mode:**
- Dark background (#1a1a1a)
- Light text (#f0f0f0)

**Automatic Switching:**
- Respects OS dark mode preference
- Can be toggled manually (if theme toggle button added)
- Theme saved in localStorage: `velvet-theme`

---

## Performance Notes

### Mobile Version
- Smaller CSS file (optimized)
- Fewer animations (better battery)
- 2-column layout (less processing)
- Smaller images (load faster)

### Desktop Version
- Full feature set
- 8-column grid (uses more resources)
- Hover effects (interactive)
- Complete animations

---

## Support & Maintenance

### Adding New Features
1. Add to `/assets/js/main.js` (both versions)
2. Update `/desktop/pages/` for desktop layout
3. Update `/mobile/pages/` for mobile layout
4. Ensure responsive in both versions

### Updating Styles
- Desktop CSS: `/assets/css/style.css`
- Mobile CSS: `/mobile/assets/css/mobile.css`

### Testing
- Always test both versions
- Use DevTools device toggle
- Test on real devices if possible

---

## URLs Summary

| Purpose | URL |
|---------|-----|
| Auto-detect & route | `/device-router.html` |
| Desktop home | `/desktop/` |
| Mobile home | `/mobile/` |
| Desktop shop | `/desktop/pages/shop.html` |
| Mobile shop | `/mobile/pages/shop.html` |
| API endpoint | `/api/products.php` |
| Shared assets | `/assets/...` |

---

**Status:** Ready for deployment
**Last Updated:** March 4, 2026
**Documentation:** See DUAL_VERSION_GUIDE.md for full details
