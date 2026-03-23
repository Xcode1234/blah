# Using Passkeys on Your Network

## The Problem
Safari (and all browsers) require **HTTPS** for passkeys when accessing from network devices. HTTP only works on `localhost`.

## Solution: Use HTTPS

### Option 1: Quick HTTPS Setup (Recommended)

Since PHP's built-in server doesn't support HTTPS, use a reverse proxy:

```bash
# Install stunnel (if not already installed)
# Ubuntu/Debian: sudo apt install stunnel4
# macOS: brew install stunnel

# Start the HTTP server (keep this running)
bash start.sh

# In another terminal, create stunnel config
cat > stunnel.conf << 'EOF'
[https]
accept = 8443
connect = 8000
cert = server.crt
key = server.key
EOF

# Start stunnel
stunnel stunnel.conf
```

Now access at: **https://192.168.1.50:8443**

### Option 2: Use ngrok (Easiest)

```bash
# Install ngrok: https://ngrok.com/download

# Start your server
bash start.sh

# In another terminal
ngrok http 8000
```

Use the ngrok HTTPS URL provided (automatically has a valid certificate).

### Option 3: Access from localhost

Just use the site from the same machine at **http://localhost:8000** - passkeys work on localhost even without HTTPS.

## Browser Certificate Warning

When using self-signed certificates:
1. You'll see "Your connection is not private" warning
2. Click **Advanced**
3. Click **Proceed to 192.168.1.50 (unsafe)**

This is safe for local development.

## Current Status

- ✅ HTTP Server: http://192.168.1.50:8000 (works for everything except passkeys on network)
- ✅ Certificates created: server.crt and server.key
- ⚠️  HTTPS needs reverse proxy (stunnel/nginx) since PHP built-in server doesn't support SSL

## Testing Passkeys

**From the same computer:**
```
http://localhost:8000 ✅ Passkeys work
```

**From other devices on network:**
```
http://192.168.1.50:8000 ❌ Passkeys blocked (needs HTTPS)
https://192.168.1.50:8443 ✅ Passkeys work (with stunnel)
```
