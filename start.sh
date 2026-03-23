#!/bin/bash

# VELVET VOGUE - QUICK START SCRIPT
# This script sets up and starts a local server for the website

echo "=========================================="
echo "  VELVET VOGUE - E-COMMERCE WEBSITE"
echo "=========================================="
echo ""

# Check if PHP is installed (PRIORITY - needed for API endpoints)
if command -v php &> /dev/null; then
    echo "✓ PHP found!"
    LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -1)
    echo "Starting PHP development server on:"
    echo "  - Local:   http://localhost:8000"
    echo "  - Network: http://${LOCAL_IP}:8000"
    echo ""
    echo "Press CTRL+C to stop the server"
    echo ""
    php -S 0.0.0.0:8000 router.php

# Check if Python is installed
elif command -v python3 &> /dev/null; then
    echo "✓ Python 3 found!"
    echo "⚠️  WARNING: Python server doesn't support PHP. API features won't work!"
    echo "Starting local server on http://localhost:8000"
    echo ""
    echo "Press CTRL+C to stop the server"
    echo ""
    python3 -m http.server 8000
    
# Check if Python 2 is installed
elif command -v python &> /dev/null; then
    echo "✓ Python found!"
    echo "Starting local server on http://localhost:8000"
    echo ""
    echo "Press CTRL+C to stop the server"
    echo ""
    python -m SimpleHTTPServer 8000

# Check if Node.js is installed
elif command -v node &> /dev/null; then
    echo "✓ Node.js found!"
    echo "Starting local server using http-server..."
    echo ""
    
    # Check if http-server is installed
    if command -v http-server &> /dev/null; then
        http-server
    else
        echo "Installing http-server globally..."
        npm install -g http-server
        http-server
    fi

else
    echo "✗ No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  1. Python 3: https://www.python.org"
    echo "  2. Python 2: https://www.python.org"
    echo "  3. Node.js: https://nodejs.org"
    echo ""
    echo "OR manually open this folder in VS Code and use Live Server extension"
    exit 1
fi
