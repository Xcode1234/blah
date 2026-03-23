#!/bin/bash

# Start both HTTP and HTTPS servers for Velvet Vogue

echo "=========================================="
echo "  VELVET VOGUE - DUAL SERVER STARTUP"
echo "=========================================="
echo ""

# Check if Node.js is available for HTTPS proxy
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. HTTPS proxy won't work."
    echo "Install Node.js for passkey support on network devices."
    echo ""
    echo "Starting HTTP server only..."
    bash start.sh
    exit 0
fi

# Start HTTP server in background
echo "Starting HTTP server..."
bash start.sh &
HTTP_PID=$!
sleep 2

# Start HTTPS proxy
echo "Starting HTTPS proxy..."
node https-proxy.js

# Cleanup on exit
trap "kill $HTTP_PID 2>/dev/null" EXIT
