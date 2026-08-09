const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e/hierarchy-management',
    testMatch: 'hierarchy-management.spec.cjs',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120000,
    expect: { timeout: 15000 },
    reporter: [['line']],
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
        launchOptions: { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }
    }
});
