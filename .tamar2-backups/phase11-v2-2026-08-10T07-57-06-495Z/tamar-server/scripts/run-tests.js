const { spawn } = require('node:child_process');

const testFiles = [
    'tests/local-auth.unit.test.js',
    'tests/local-auth-architecture.test.js',
    'tests/phase2a-role-policy.test.js',
    'tests/phase2a-additional-acceptance.test.js',
    'tests/phase2a-mongo.integration.test.js',
    'tests/phase2a-services.integration.test.js',
    'tests/phase2a-no-routes.test.js',
    'tests/phase3a-hierarchy.integration.test.js',
    'tests/phase3a-authorization.integration.test.js',
    'tests/phase3a-no-routes.test.js',
    'tests/organization-hierarchy-http.integration.test.js',
    'tests/real-data-access-realtime.unit.test.js',
    'tests/phase2b-authentication.unit.test.js',
    'tests/phase2b-http-access.integration.test.js',
    'tests/phase2b-socket.integration.test.js',
    'tests/phase4-ticket-core.unit.test.js',
    'tests/phase4-ticket-core.integration.test.js',
    'tests/phase4-ticket-http.integration.test.js',
    'tests/phase4-contract.test.js',
    'tests/phase4-ticket-resilience.integration.test.js',
    'tests/phase5-ticket-assignments.unit.test.js',
    'tests/phase5-ticket-assignments.integration.test.js',
    'tests/phase5-ticket-assignments-http.integration.test.js',
    'tests/phase5-ticket-assignments-resilience.integration.test.js',
    'tests/phase5r-commonjs-routes.test.js',
    'tests/phase6-ticket-transfers.unit.test.js',
    'tests/phase6-ticket-transfers.integration.test.js',
    'tests/phase6-ticket-transfers-http.integration.test.js',
    'tests/phase6-ticket-transfers-resilience.integration.test.js',
    'tests/phase6-ticket-transfers-contract.test.js',
    'tests/phase7a-ticket-messages.unit.test.js',
    'tests/phase7a-ticket-messages.integration.test.js',
    'tests/phase7a-ticket-messages-http.integration.test.js',
    'tests/phase7a-ticket-messages-resilience.integration.test.js',
    'tests/phase7a-ticket-messages-contract.test.js',
    'tests/phase7av-ticket-messages-verification.unit.test.js',
    'tests/phase7av-ticket-messages-authorization.integration.test.js',
    'tests/phase7av-ticket-messages-database.integration.test.js',
    'tests/phase7av-ticket-capabilities.integration.test.js',
    'tests/phase7av-ticket-messages-http.integration.test.js',
    'tests/phase7av-ticket-messages-realtime.integration.test.js',
    'tests/phase7av-ticket-messages-contract.test.js',
    'tests/phase8-ticket-boards-contract.test.js',
    'tests/phase8-ticket-boards.integration.test.js',
    'tests/phase8-ticket-boards-acceptance.integration.test.js',
    'tests/phase8-ticket-boards-http.integration.test.js'
];

const child = spawn(process.execPath, [
    '--test',
    '--experimental-test-isolation=none',
    '--test-concurrency=1',
    ...testFiles
], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit'
});

child.once('error', (error) => {
    console.error(`Unable to start test runner: ${error.message}`);
    process.exitCode = 1;
});

child.once('exit', (code, signal) => {
    if (signal) {
        console.error(`Test runner terminated by signal ${signal}`);
        process.exitCode = 1;
        return;
    }
    process.exitCode = code ?? 1;
});
