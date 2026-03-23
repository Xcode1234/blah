#!/bin/bash

# Setup local domain for passkeys on Safari
# This script adds a local domain to /etc/hosts so Safari will accept passkeys

LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -1)
DOMAIN="velvetvogue.local"

echo "=========================================="
echo "  LOCAL DOMAIN SETUP FOR SAFARI"
echo "=========================================="
echo ""
echo "Safari doesn't support passkeys on IP addresses."
echo "This script will add a local domain name."
echo ""
echo "Domain: $DOMAIN"
echo "Points to: $LOCAL_IP"
echo ""

# Check if entry already exists
if grep -q "$DOMAIN" /etc/hosts 2>/dev/null; then
    echo "✓ Entry already exists in /etc/hosts"
else
    echo "Adding entry to /etc/hosts (requires sudo)..."
    echo "$LOCAL_IP $DOMAIN" | sudo tee -a /etc/hosts > /dev/null
    echo "✓ Entry added!"
fi

echo ""
echo "=========================================="
echo "  INSTRUCTIONS:"
echo "=========================================="
echo ""
echo "1. On your Mac, add the same entry:"
echo "   sudo nano /etc/hosts"
echo "   Add this line:"
echo "   $LOCAL_IP $DOMAIN"
echo ""
echo "2. Access the site at:"
echo "   https://$DOMAIN:8443"
echo ""
echo "3. Accept the certificate warning"
echo ""
echo "4. Passkeys will now work on Safari! 🎉"
echo ""
