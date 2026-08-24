const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e/phase11',
    timeout: 180000,
    expect: { timeout: 15000 },
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],
    use: {
        headless: true,
        viewport: { width: 1440, height: 900 },
        locale: 'he-IL',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    }
});
