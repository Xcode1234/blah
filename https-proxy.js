const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// SSL certificate paths
const certPath = path.join(__dirname, 'server.crt');
const keyPath = path.join(__dirname, 'server.key');

// Check if certificates exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('❌ SSL certificates not found!');
    console.error('Please run: openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 365 -subj "/CN=192.168.1.50"');
    process.exit(1);
}

// Create HTTPS server that proxies to PHP server
const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

const server = https.createServer(options, (req, res) => {
    // Proxy request to PHP server
    const proxyReq = http.request({
        hostname: 'localhost',
        port: 8000,
        path: req.url,
        method: req.method,
        headers: req.headers
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502);
        res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
});

const PORT = 8443;
const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('==========================================');
    console.log('  VELVET VOGUE - HTTPS PROXY SERVER');
    console.log('==========================================');
    console.log('');
    console.log('✓ HTTPS server running on:');
    console.log(`  - Local:   https://localhost:${PORT}`);
    console.log(`  - Network: https://${localIP}:${PORT}`);
    console.log('');
    console.log('⚠️  Certificate Warning:');
    console.log('   You\'ll see a security warning in your browser.');
    console.log('   Click "Advanced" → "Proceed" to continue.');
    console.log('');
    console.log('✓ Passkeys will work on all devices!');
    console.log('');
    console.log('Press CTRL+C to stop');
    console.log('');
});
