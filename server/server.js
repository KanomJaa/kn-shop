require('dotenv').config();

const app = require('./app');
const startServer = require('./bootstrap/startServer');

startServer(app).catch((err) => {
    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
});