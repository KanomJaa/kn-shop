const fs = require('fs');
const http = require('http');
const https = require('https');

const connectDB = require('../config/db');
const seedDatabase = require('../services/seedDatabase');

function logServerReady(protocol, port, suffix = '') {
    console.log(`\n🚀 KN Shop Server running at ${protocol}://localhost:${port}${suffix}`);
    console.log(`🔑 Admin user: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`   ${process.env.GOOGLE_CLIENT_ID ? '✅' : '⬜'} Google OAuth`);
    console.log(`   ${process.env.FACEBOOK_APP_ID ? '✅' : '⬜'} Facebook OAuth`);
    console.log(`   ${process.env.TRUST_PROXY ? '✅' : '⬜'} Trusted proxy`);
}

async function startServer(app) {
    await connectDB();
    await seedDatabase();

    const port = Number.parseInt(process.env.PORT, 10) || 5000;
    const sslConfigured = process.env.SSL_ENABLED === 'true'
        && process.env.SSL_CERT_PATH
        && process.env.SSL_KEY_PATH;

    if (!sslConfigured) {
        return app.listen(port, () => logServerReady('http', port));
    }

    try {
        const sslOptions = {
            cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            ...(process.env.SSL_CA_PATH ? { ca: fs.readFileSync(process.env.SSL_CA_PATH) } : {}),
        };

        const httpsServer = https.createServer(sslOptions, app).listen(443, () => {
            logServerReady('https', 443);
        });

        const redirectServer = http.createServer((req, res) => {
            const host = String(req.headers.host || 'localhost').replace(/:\d+$/, '');
            res.writeHead(301, { Location: `https://${host}${req.url}` });
            res.end();
        }).listen(80, () => console.log('↩️ HTTP → HTTPS redirect on port 80'));

        return { httpsServer, redirectServer };
    } catch (err) {
        console.error('❌ SSL Error:', err.message);
        return app.listen(port, () => logServerReady('http', port, ' (SSL failed)'));
    }
}

module.exports = startServer;
