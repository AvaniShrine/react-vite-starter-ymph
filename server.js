const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const next = require('next');

// Determine environment
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL certificate paths
const sslCertPath = '/etc/letsencrypt/live/sampleship.elitechem.com/fullchain.pem';
const sslKeyPath = '/etc/letsencrypt/live/sampleship.elitechem.com/privkey.pem';
const useHttps = fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath);

// Ports
const HTTPS_PORT = process.env.PORT || (useHttps ? 443 : 3000);
const HTTP_PORT = 80;

app.prepare().then(() => {
    const server = express();

    // Enable CORS
    server.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Add security headers
    server.use((req, res, next) => {
        // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        // res.setHeader('X-Content-Type-Options', 'nosniff');
        // res.setHeader('X-XSS-Protection', '1; mode=block');
        // res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        // res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

    // Route all requests through Next.js
    server.all(/.*/, (req, res) => {
        return handle(req, res);
    });

    if (useHttps) {
        // Create HTTPS server
        const sslOptions = {
            key: fs.readFileSync(sslKeyPath),
            cert: fs.readFileSync(sslCertPath),
        };

        https.createServer(sslOptions, server).listen(HTTPS_PORT, () => {
            console.log(`✅ HTTPS Server running on https://localhost:${HTTPS_PORT}`);
        });

        // Redirect HTTP to HTTPS
        const httpApp = express();
        httpApp.use(cors());
        httpApp.use((req, res) => {
            const host = req.headers.host;
            const secureUrl = `https://${host.split(':')[0]}${HTTPS_PORT !== 443 ? `:${HTTPS_PORT}` : ''}${req.url || ''}`;
            res.redirect(301, secureUrl);
        });

        http.createServer(httpApp).listen(HTTP_PORT, () => {
            console.log(`🔁 HTTP Server running on port ${HTTP_PORT} (redirecting to HTTPS)`);
        });
    } else {
        // Fallback for development without SSL
        server.listen(HTTPS_PORT, () => {
            console.log(`⚠️  HTTP Server running at http://localhost:${HTTPS_PORT} (no SSL certs found)`);
        });
    }
});
