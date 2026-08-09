import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const matrixPath = resolve(process.cwd(), 'docs/phase9-verification-matrix.md');
const requiredIds = [
    ...Array.from({ length: 25 }, (_, index) => `P9-${String(index + 1).padStart(3, '0')}`),
    ...Array.from({ length: 75 }, (_, index) => `P9V-${String(index + 1).padStart(3, '0')}`)
];
const behavioralTypes = new Set(['unit', 'component', 'integration', 'authenticated HTTP', 'real Backend E2E', 'browser E2E', 'Socket.IO E2E']);

const parseRows = (markdown) => markdown.split(/\r?\n/u)
    .filter((line) => /^\| P9V?-\d{3} \|/u.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim().replaceAll('&#124;', '|')));

const assertManualCommandExists = async (testFile, testName) => {
    if (testFile.endsWith('package.json')) {
        const pkg = JSON.parse(await readFile(resolve(process.cwd(), testFile), 'utf8'));
        const scriptName = testName === 'npm test' ? 'test' : testName.replace(/^npm run /u, '');
        assert.equal(typeof pkg.scripts?.[scriptName], 'string', `${testFile} is missing script ${scriptName}`);
        return;
    }
    const source = await readFile(resolve(process.cwd(), testFile), 'utf8');
    assert.ok(source.includes(testName), `${testFile} does not document ${testName}`);
};

test('P9V-TRACE-001 every Phase 9 and Phase 9-V requirement has complete executable traceability', async () => {
    const rows = parseRows(await readFile(matrixPath, 'utf8'));
    assert.equal(rows.length, requiredIds.length);
    const byId = new Map(rows.map((row) => [row[0], row]));
    assert.equal(byId.size, requiredIds.length, 'Requirement IDs must be unique');
    for (const id of requiredIds) {
        assert.ok(byId.has(id), `Missing requirement ${id}`);
        const [rowId, description, implementation, testFile, testName, testType, baseline, resolution, finalResult] = byId.get(id);
        assert.ok(description, `${rowId} has no description`);
        assert.ok(implementation, `${rowId} has no implementation location`);
        assert.ok(testFile, `${rowId} has no test file`);
        assert.ok(testName, `${rowId} has no exact test name`);
        assert.equal(finalResult, 'covered', `${rowId} is not finally covered`);
        assert.equal(baseline, 'covered', `${rowId} baseline was not resolved`);
        assert.ok(resolution, `${rowId} has no resolution`);
        const implementationFile = implementation.split('#')[0];
        await access(resolve(process.cwd(), implementationFile));
        await access(resolve(process.cwd(), testFile));
        if (testType === 'manual acceptance') {
            await assertManualCommandExists(testFile, testName);
        } else {
            const testSource = await readFile(resolve(process.cwd(), testFile), 'utf8');
            assert.ok(testSource.includes(testName), `${rowId} references missing test name: ${testName}`);
        }
        if (behavioralTypes.has(testType)) assert.notEqual(testType, 'manual acceptance');
    }
});