// ================================================================
//  Swagger API Documentation (#10)
// ================================================================
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'KN Shop API',
            version: '1.1.0',
            description: `
## 🎮 KN Shop — Roblox Game Item Store API

ระบบ API สำหรับร้านค้าไอเทมเกม Roblox ครบวงจร

### Authentication
- ใช้ **Bearer Token** ใน Header: \`Authorization: Bearer <token>\`
- Access Token อายุ 15 นาที
- Refresh Token อายุ 7 วัน (httpOnly cookie)

### Rate Limiting
- API ทั่วไป: 100 req/min
- Auth: 10 req/min
- OTP: 5 req/10min
- Checkout: 5 req/min per user
- Topup: 5 req/5min per user
            `,
            contact: { name: 'KN Shop', url: 'https://knshop.com' },
        },
        servers: [
            { url: '/api', description: 'API Server' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Access Token',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '64abc123def456' },
                        username: { type: 'string', example: 'player01' },
                        email: { type: 'string', example: 'user@email.com' },
                        role: { type: 'string', enum: ['member', 'admin'] },
                        points: { type: 'number', example: 1000 },
                        emailVerified: { type: 'boolean', example: false },
                        robloxUsername: { type: 'string', example: 'RobloxPlayer' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        title: { type: 'string', example: 'Leopard Fruit' },
                        price: { type: 'number', example: 100 },
                        categorySlug: { type: 'string', example: 'blox-fruits' },
                        inStock: { type: 'boolean', example: true },
                        stockQty: { type: 'number', example: 50 },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        msg: { type: 'string', example: 'เกิดข้อผิดพลาด' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'สมัคร/เข้าสู่ระบบ/OAuth' },
            { name: 'Payment', description: 'เติมเงิน/กระเป๋า' },
            { name: 'Products', description: 'สินค้า' },
            { name: 'Orders', description: 'สั่งซื้อ' },
            { name: 'Admin', description: 'จัดการระบบ (Admin only)' },
        ],
        paths: {
            '/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'สมัครสมาชิก',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'email', 'password'],
                                    properties: {
                                        username: { type: 'string', minLength: 3, maxLength: 30, example: 'player01' },
                                        email: { type: 'string', format: 'email', example: 'user@email.com' },
                                        password: { type: 'string', minLength: 6, example: 'pass123' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'สมัครสำเร็จ' },
                        400: { description: 'ข้อมูลไม่ถูกต้อง' },
                    },
                },
            },
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'เข้าสู่ระบบ',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['emailOrUsername', 'password'],
                                    properties: {
                                        emailOrUsername: { type: 'string', example: 'player01' },
                                        password: { type: 'string', example: 'pass123' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'เข้าสู่ระบบสำเร็จ — ได้ accessToken + refreshToken cookie' },
                        401: { description: 'ข้อมูลไม่ถูกต้อง' },
                    },
                },
            },
            '/auth/refresh-token': {
                post: {
                    tags: ['Auth'],
                    summary: 'Refresh Access Token',
                    description: 'ใช้ refresh token จาก httpOnly cookie เพื่อรับ access token ใหม่',
                    responses: {
                        200: { description: 'ได้ access token ใหม่' },
                        401: { description: 'Refresh token หมดอายุ' },
                    },
                },
            },
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'ข้อมูลผู้ใช้ปัจจุบัน',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'สำเร็จ' },
                        401: { description: 'ไม่ได้เข้าสู่ระบบ' },
                    },
                },
            },
            '/payment/topup': {
                post: {
                    tags: ['Payment'],
                    summary: 'ส่งคำขอเติมเงิน (รอ Admin อนุมัติ)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['amount', 'method', 'slipImage'],
                                    properties: {
                                        amount: { type: 'integer', minimum: 1, maximum: 100000, example: 100 },
                                        method: { type: 'string', enum: ['bank'], example: 'bank' },
                                        slipImage: { type: 'string', example: '/uploads/slip-123.jpg' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'ส่งคำขอสำเร็จ' },
                        400: { description: 'ข้อมูลไม่ถูกต้อง' },
                        429: { description: 'Rate limit exceeded' },
                    },
                },
            },
            '/orders/checkout': {
                post: {
                    tags: ['Orders'],
                    summary: 'สั่งซื้อสินค้า (หัก Point)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['items'],
                                    properties: {
                                        items: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                required: ['productId', 'qty'],
                                                properties: {
                                                    productId: { type: 'string', example: '64abc123def456' },
                                                    qty: { type: 'integer', minimum: 1, maximum: 100, example: 1 },
                                                    robloxUsername: { type: 'string', example: 'Player01' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'สั่งซื้อสำเร็จ' },
                        400: { description: 'Point ไม่พอ / สต็อกไม่พอ' },
                    },
                },
            },
            '/products': {
                get: {
                    tags: ['Products'],
                    summary: 'ดูสินค้าทั้งหมด',
                    parameters: [
                        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'กรอง slug หมวดหมู่' },
                    ],
                    responses: {
                        200: { description: 'สำเร็จ' },
                    },
                },
            },
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health Check',
                    responses: {
                        200: { description: 'Server is healthy' },
                    },
                },
            },
        },
    },
    apis: [],  // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: `
            .swagger-ui .topbar { background: linear-gradient(135deg, #1e88e5, #0d47a1); }
            .swagger-ui .info h1 { color: #1e88e5; }
        `,
        customSiteTitle: 'KN Shop API Docs',
    }));

    // JSON spec endpoint
    app.get('/api-docs.json', (req, res) => {
        res.json(swaggerSpec);
    });

    console.log('📖 API Docs available at /api-docs');
}

module.exports = { setupSwagger };
