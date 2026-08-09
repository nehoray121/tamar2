import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const matrix = JSON.parse(await readFile(new URL('../../../../../docs/phase10/traceability-matrix.json', import.meta.url), 'utf8'));
const e2e = await readFile(new URL('../../../../../e2e/phase10/phase10.spec.cjs', import.meta.url), 'utf8').catch(() => '');
const implementationDoc = new URL('../../../../../docs/phase10-ticket-chat-frontend.md', import.meta.url);
const verificationDoc = new URL('../../../../../docs/phase10-verification-matrix.md', import.meta.url);

test('Phase 10 traceability matrix covers every mandatory Browser flow with executable evidence', async () => {
    assert.equal(matrix.phase, '10');
    assert.equal(matrix.flows.length, 13);
    assert.equal(new Set(matrix.flows.map((flow) => flow.id)).size, 13);
    assert.deepEqual(matrix.flows.map((flow) => flow.id), matrix.requiredIds);
    for (const flow of matrix.flows) {
        assert.match(flow.id, /^P10-E2E-\d{3}$/);
        assert.ok(flow.requirement.length > 12);
        assert.ok(flow.implementation.length > 12);
        assert.equal(flow.testFile, 'e2e/phase10/phase10.spec.cjs');
        assert.equal(flow.testType, 'authenticated-browser-e2e');
        assert.ok(flow.baselineStatus.length > 3);
        assert.ok(flow.resolution.length > 12);
        assert.equal(flow.finalStatus, 'covered');
        assert.ok(e2e.includes("test('" + flow.testName + "'"));
    }
    await Promise.all([access(implementationDoc), access(verificationDoc)]);
});
