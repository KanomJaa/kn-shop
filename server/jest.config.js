module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    verbose: true,
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/tests/**/*.test.js'],
};
