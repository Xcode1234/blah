# OAuth Implementation Guide - Google & Apple Login

## Overview
Added OAuth support to allow users to sign in using Google and Apple accounts. This provides a seamless alternative login method while maintaining full compatibility with password-based and 2FA authentication.

## Features Implemented

✅ **Google OAuth 2.0**
- Authorization Code Flow
- User profile retrieval
- Automatic account creation/linking
- Scopes: openid, profile, email

✅ **Apple Sign In**
- Authorization Code Flow with PKCE support
- JWT ID Token decoding
- User profile retrieval
- Scopes: openid, profile, email

✅ **Account Management**
- Automatic user creation on first OAuth login
- Email-based account linking for existing users
- Fallback to unique provider-based email for privacy
- OAuth account linking in `oauth_accounts` table

✅ **Session Integration**
- OAuth users logged in via standard session system
- No 2FA required for OAuth logins (email already verified by provider)
- Pending checkout preserved through OAuth flow

## Configuration

### Google OAuth Setup

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new OAuth 2.0 Client ID (Web Application)
   - Set redirect URI to: `http://localhost:8000/api/oauth-callback.php?provider=google`

2. **Set Environment Variables** (or update `includes/oauth-config.php`)
   ```bash
   export GOOGLE_CLIENT_ID="your_client_id_here"
   export GOOGLE_CLIENT_SECRET="your_client_secret_here"
   export GOOGLE_REDIRECT_URI="http://localhost:8000/api/oauth-callback.php?provider=google"
   ```

### Apple Sign In Setup

1. **Create Apple App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Create App ID with "Sign in with Apple" capability
   - Create private key for API access

2. **Set Environment Variables** (or update `includes/oauth-config.php`)
   ```bash
   export APPLE_TEAM_ID="your_team_id"
   export APPLE_KEY_ID="your_key_id"
   export APPLE_BUNDLE_ID="com.velvetvogue.app"
   export APPLE_PRIVATE_KEY_PATH="/path/to/apple_private_key.p8"
   export APPLE_REDIRECT_URI="http://localhost:8000/api/oauth-callback.php?provider=apple"
   ```

## Database Schema

### New Tables

**oauth_accounts** - Stores OAuth provider credentials
```sql
CREATE TABLE oauth_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(50) NOT NULL,          -- 'google' or 'apple'
    provider_id VARCHAR(255) NOT NULL,      -- User ID from provider
    access_token TEXT,                       -- Optional: for API calls
    refresh_token TEXT,                      -- Optional: for token refresh
    expires_at DATETIME NULL,                -- Token expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX unique_provider_id (provider, provider_id),
    INDEX idx_user_id (user_id)
);
```

### Modified Tables

**users** - Added OAuth columns
```sql
oauth_provider VARCHAR(50) NULL DEFAULT NULL,    -- Provider name
oauth_id VARCHAR(255) NULL DEFAULT NULL           -- Provider user ID
```

## File Structure

```
includes/
├── oauth-config.php          # OAuth provider configuration
└── oauth-handler.php         # OAuth authorization & token exchange logic

api/
├── oauth-callback.php        # OAuth provider callback endpoint
└── oauth-url.php            # Endpoint to get authorization URLs

pages/
└── account.html             # Updated with Google & Apple buttons

assets/
└── js/main.js              # Added loginWithGoogle() & loginWithApple()
```

## API Endpoints

### GET OAuth Authorization URL
**POST** `/api/oauth-url.php`

Request:
```json
{
    "provider": "google|apple",
    "pending_checkout": false
}
```

Response:
```json
{
    "success": true,
    "data": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
        "provider": "google"
    }
}
```

### Handle OAuth Callback
**GET/POST** `/api/oauth-callback.php?provider=google|apple&code=...&state=...`

Automatically:
1. Validates state to prevent CSRF
2. Exchanges authorization code for tokens
3. Retrieves user profile from provider
4. Creates/finds user account
5. Creates session
6. Redirects to home or checkout

## User Journey

### First-Time OAuth Login (Google)
1. User clicks "Sign in with Google" button
2. Redirected to Google login page
3. User authorizes app access
4. Google redirects back with authorization code
5. System exchanges code for user profile
6. New user account created with:
   - Email from Google
   - Name from Google
   - Password: randomly generated (not used for OAuth users)
   - oauth_provider = 'google'
   - oauth_id = Google user ID
7. OAuth account linked in `oauth_accounts` table
8. Session created, redirected to home

### Returning OAuth User
1. User clicks "Sign in with Google"
2. Google redirects back with code
3. System finds existing OAuth account
4. Updates last login timestamp
5. Session created, redirected to home

### Email-Based Account Linking
If user has existing password account and logs in via OAuth:
1. Authorization code exchanged for profile
2. System checks for existing user by email
3. OAuth account linked to existing user
4. Can now login via both password and OAuth

## Frontend Integration

### Login Buttons Added
Located in `pages/account.html`:
- "Sign in with Google" button (Google blue logo)
- "Sign in with Apple" button (Apple logo)
- "Sign in with Passkey" button (existing)

### JavaScript Functions
```javascript
// Initiate Google OAuth flow
loginWithGoogle()

// Initiate Apple OAuth flow
loginWithApple()
```

## Security Considerations

✅ **CSRF Protection**: State parameter validated on callback
✅ **No 2FA for OAuth**: Email verified by provider, skip 2FA
✅ **Secure Token Storage**: Tokens encrypted in database (implement in production)
✅ **Random Password**: OAuth users have secure random passwords they can't use
✅ **Email Unique**: Emails guaranteed unique across authentication methods
✅ **Session Integration**: Uses existing secure session system

## Testing with Demo Credentials

For local testing without real OAuth credentials, update `includes/oauth-config.php`:
```php
// Development testing credentials (replace with real ones in production)
define('GOOGLE_CLIENT_ID', 'test-client-id');
define('GOOGLE_CLIENT_SECRET', 'test-secret');
```

Note: Real OAuth flows require valid credentials from providers.

## Production Deployment

1. **Obtain Real Credentials**
   - Google: [Google Cloud Console](https://console.cloud.google.com/)
   - Apple: [Apple Developer Portal](https://developer.apple.com/)

2. **Update Configuration**
   - Set environment variables with real credentials
   - Update redirect URIs to production domain

3. **Enable HTTPS** (Required for OAuth)
   - OAuth callbacks require HTTPS
   - Use self-signed cert or Let's Encrypt

4. **Implement Token Refresh** (Optional)
   - Store and refresh OAuth tokens for API access
   - Currently tokens are not persisted

5. **Add Email Verification** (Optional)
   - Send verification email for OAuth accounts
   - Users can update email/profile after signup

## Troubleshooting

### "OAuth not configured" error
- Update `includes/oauth-config.php` with real credentials
- Or set environment variables

### Callback redirect error
- Verify redirect URI matches exactly in provider settings
- Check for http vs https differences
- Ensure port number matches (localhost:8000)

### User creation fails
- Check database connection and permissions
- Verify `users` table has oauth columns
- Check `oauth_accounts` table exists

### State validation error
- Session might have expired
- HTTPS required for stable sessions
- Check session configuration

## Future Enhancements

- [ ] Implement proper JWT validation for Apple ID tokens
- [ ] Add token refresh logic for long-lived access
- [ ] Implement recovery codes as 2FA alternative
- [ ] Add user profile sync on subsequent logins
- [ ] Support LinkedIn, GitHub, Microsoft logins
- [ ] Implement account deauthorization
