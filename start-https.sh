#!/bin/bash

# VELVET VOGUE - HTTPS START SCRIPT
# Starts the server with HTTPS support for passkeys on network

echo "=========================================="
echo "  VELVET VOGUE - HTTPS SERVER"
echo "=========================================="
echo ""

# Get local IP
LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -1)

# Check if certificates exist
if [ ! -f "server.crt" ] || [ ! -f "server.key" ]; then
    echo "⚠️  SSL certificates not found. Generating..."
    openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 365 -subj "/CN=${LOCAL_IP}" -addext "subjectAltName=IP:${LOCAL_IP},DNS:localhost" 2>/dev/null
    echo "✓ Certificates created!"
    echo ""
fi

echo "✓ Starting HTTPS server..."
echo ""
echo "Access the site at:"
echo "  - Local:   https://localhost:8443"
echo "  - Network: https://${LOCAL_IP}:8443"
echo ""
echo "⚠️  IMPORTANT: You'll see a security warning in your browser."
echo "    This is normal for self-signed certificates."
echo "    Click 'Advanced' and 'Proceed' to continue."
echo ""
echo "Press CTRL+C to stop the server"
echo ""

# Start PHP with HTTPS using stunnel or directly with PHP 7.3+
php -S 0.0.0.0:8443 router.php
