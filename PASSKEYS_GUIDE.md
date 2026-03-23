# 🔑 Passkeys Authentication - Implementation Guide

## Overview

Passkeys (WebAuthn/FIDO2) have been successfully added to Velvet Vogue! Users can now sign in using:
- 🔒 Biometric authentication (Face ID, Touch ID, Windows Hello)
- 🔑 Security keys (YubiKey, Titan Key, etc.)
- 📱 Platform authenticators (phone, laptop)

## Features Implemented

### ✅ For Users
1. **Register Passkeys** - Add multiple passkeys to your account
2. **Login with Passkeys** - Quick, passwordless authentication
3. **Manage Passkeys** - View and delete registered passkeys
4. **Device Naming** - Name your passkeys for easy identification

### ✅ Backend (PHP)
- **API Endpoints** (`/api/passkeys.php`):
  - `POST /api/passkeys.php?action=register-start` - Start passkey registration
  - `POST /api/passkeys.php?action=register-finish` - Complete registration
  - `POST /api/passkeys.php?action=login-start` - Start authentication
  - `POST /api/passkeys.php?action=login-finish` - Complete authentication
  - `GET /api/passkeys.php?action=list` - List user's passkeys
  - `DELETE /api/passkeys.php?id={id}` - Delete a passkey

### ✅ Frontend (JavaScript)
- **WebAuthn Integration** (`/assets/js/passkeys.js`):
  - `registerPasskey()` - Register new passkey
  - `loginWithPasskey()` - Authenticate with passkey
  - `loadPasskeysList()` - Load user's passkeys
  - `deletePasskey(id)` - Remove a passkey
  - Browser compatibility checks

### ✅ Database
- **New Table**: `passkeys`
  - Stores credential IDs, public keys
  - Links to user accounts
  - Tracks usage statistics
  - Device naming for management

## How to Use

### For End Users

#### 1. Register a Passkey
1. Log in to your account with email/password
2. Go to the **Profile** tab
3. Click **"+ Add Passkey"** button
4. Follow your device's prompts (Face ID, fingerprint, etc.)
5. Name your passkey (e.g., "iPhone", "MacBook")
6. Done! Your passkey is registered

#### 2. Login with Passkey
1. Go to the login page
2. Click **"🔑 Sign in with Passkey"** button
3. Select your passkey when prompted
4. Authenticate with biometrics or PIN
5. You're logged in!

#### 3. Manage Passkeys
1. Go to **Profile** tab when logged in
2. View all your registered passkeys
3. See when each was created and last used
4. Delete passkeys you no longer use

### For Developers

#### Testing Passkeys Locally

**Important**: Passkeys require HTTPS in production, but work on `localhost` for development.

1. **Start the server**:
   ```bash
   bash start.sh
   ```

2. **Access the site**:
   ```
   http://localhost:8000
   ```

3. **Test registration**:
   - Log in with a test account
   - Add a passkey using your device's authenticator
   - Try logging out and back in with the passkey

4. **Check the database**:
   ```bash
   php -r "require 'includes/config.php'; \$db = Database::getInstance()->getConnection(); \$result = \$db->query('SELECT * FROM passkeys'); while(\$row = \$result->fetch_assoc()) { print_r(\$row); }"
   ```

#### Browser Support

Passkeys work on:
- ✅ **Chrome/Edge** 67+ (Windows, Mac, Linux, Android)
- ✅ **Safari** 13+ (macOS 10.15+, iOS 14+)
- ✅ **Firefox** 60+ (Windows, Mac, Linux)

#### API Examples

**Register a passkey**:
```javascript
// User must be logged in first
await registerPasskey();
```

**Login with passkey**:
```javascript
// Can be called from login page
await loginWithPasskey();
```

**List user's passkeys**:
```bash
curl -X GET 'http://localhost:8000/api/passkeys.php?action=list' \
  --cookie "PHPSESSID=your_session_id"
```

## Security Features

✅ **Phishing Resistant** - Passkeys are bound to your domain  
✅ **No Passwords Stored** - Only public keys are saved  
✅ **Multi-Device Support** - Register multiple authenticators  
✅ **Counter Tracking** - Detects cloned authenticators  
✅ **Session-Based** - Passkey logins don't persist across browser closes  

## Database Schema

```sql
CREATE TABLE passkeys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    credential_id VARCHAR(512) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INT DEFAULT 0,
    device_name VARCHAR(255) DEFAULT 'Unknown Device',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Files Modified/Created

### New Files
- ✅ `/api/passkeys.php` - Backend API for passkey operations
- ✅ `/assets/js/passkeys.js` - Frontend WebAuthn integration
- ✅ `/database_passkeys.sql` - Database schema for passkeys
- ✅ `/migrate_passkeys.php` - One-time database migration script

### Modified Files
- ✅ `/pages/account.html` - Added passkey UI elements
  - "Sign in with Passkey" button on login form
  - Passkey management section in Profile tab

## Production Deployment

### Requirements
1. **HTTPS is mandatory** - Passkeys don't work on non-localhost HTTP
2. **Valid domain** - Must have a registered domain name
3. **RP ID configuration** - Update `window.location.hostname` if using subdomain

### Steps
1. Deploy to HTTPS server
2. Update RP ID in `/assets/js/passkeys.js` if needed:
   ```javascript
   rp: {
       name: "Velvet Vogue",
       id: "yourdomain.com"  // Update this
   }
   ```
3. Test registration and authentication
4. Monitor passkeys table for usage

## Troubleshooting

### "Passkeys are not supported on this device"
- Update your browser to the latest version
- Check if your device has a platform authenticator
- Try using Chrome/Edge on desktop

### "Registration cancelled or not allowed"
- User cancelled the browser prompt
- Device doesn't have biometrics enabled
- Security key wasn't inserted

### "Invalid credential"
- Passkey might have been deleted from the database
- Browser/OS might have removed the credential
- Try registering a new passkey

### Database connection errors
- Run `php migrate_passkeys.php` to create the table
- Check database credentials in `includes/config.php`
- Verify MySQL/MariaDB is running

## Future Enhancements

- [ ] Cross-device authentication (QR code flow)
- [ ] Backup passkeys (recovery keys)
- [ ] Passkey-only accounts (no password required)
- [ ] Admin dashboard for passkey analytics
- [ ] Email notifications for passkey changes

## Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [W3C WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [FIDO Alliance](https://fidoalliance.org/)
- [Passkeys.dev](https://passkeys.dev/)

---

**Status**: ✅ Fully Implemented and Tested  
**Last Updated**: March 4, 2026
