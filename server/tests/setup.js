// ================================================================
//  Test Setup — MongoDB Memory Server
//  ใช้ MongoDB ใน memory สำหรับ test (ไม่กระทบ DB จริง)
// ================================================================
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret-key-12345';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.ACCESS_TOKEN_EXPIRES = '15m';
    process.env.NODE_ENV = 'test';

    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clean up collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});
