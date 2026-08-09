import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { resolveCanonicalRoomId } from '../../hooks/useInquiryOrganization.js';
import { runBounded, stateReflectsInput } from '../hooks/useTicketBoard.js';

const readProjectFile = (path) => readFile(resolve(process.cwd(), path), 'utf8');

test('P9V-ARCH-001 canonical room context accepts only selected canonical ObjectIds and has no environment Room fallback', async () => {
    assert.equal(resolveCanonicalRoomId({ backendId: '507f1f77bcf86cd799439011' }), '507f1f77bcf86cd799439011');
    assert.equal(resolveCanonicalRoomId({ id: '507f191e810c19729de860ea' }), '507f191e810c19729de860ea');
    assert.equal(resolveCanonicalRoomId({ id: 'room-a' }), '');
    assert.equal(resolveCanonicalRoomId(null), '');
    const source = await readProjectFile('src/features/tickets/hooks/useInquiryOrganization.js');
    assert.doesNotMatch(source, /VITE_TAMAR_ROOM_ID|configuredRoomId/);
});

test('P9V-ARCH-002 conflict convergence recognizes an already-applied category or pin state', () => {
    assert.equal(stateReflectsInput({ category: { id: 'category-a' }, isPinned: true }, { categoryId: 'category-a' }), true);
    assert.equal(stateReflectsInput({ category: null, isPinned: false }, { categoryId: null, isPinned: false }), true);
    assert.equal(stateReflectsInput({ category: { id: 'category-b' }, isPinned: false }, { categoryId: 'category-a' }), false);
    assert.equal(stateReflectsInput({ category: null, isPinned: false }, { isPinned: true }), false);
});

test('P9V-ARCH-003 bounded bulk worker never exceeds the configured concurrency', async () => {
    let active = 0;
    let maximum = 0;
    const results = await runBounded(Array.from({ length: 12 }, (_, index) => index), async (value) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
        active -= 1;
        return value * 2;
    }, 4);
    assert.equal(maximum, 4);
    assert.equal(results.length, 12);
    assert.equal(results.every((result) => result.ok), true);
});

test('P9V-ARCH-004 production Board integration contains no fake token, browser persistence or Socket write path', async () => {
    const files = [
        'src/features/tickets/boards/api/authenticatedHttpClient.js',
        'src/features/tickets/boards/hooks/useTicketBoard.js',
        'src/features/tickets/boards/realtime/boardSocket.js',
        'src/features/tickets/hooks/useInquiryOrganization.js'
    ];
    const source = (await Promise.all(files.map(readProjectFile))).join('\n');
    assert.doesNotMatch(source, /localStorage|sessionStorage|personal.?number/i);
    assert.doesNotMatch(source, /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/);
    assert.doesNotMatch(source, /socket\.(emit|send)\s*\(/);
    assert.match(source, /__TAMAR_AUTH__|configureAccessTokenProvider/);
});
test('P9V-ARCH-005 Board controls preserve their RTL and accessibility contracts', async () => {
    const pin = await readProjectFile('src/features/tickets/components/InquiryPinButton.jsx');
    const dialog = await readProjectFile('src/features/tickets/components/InquiryCategoryDialog.jsx');
    const listPage = await readProjectFile('src/pages/TicketListPage/TicketListPage.jsx');
    assert.match(pin, /aria-pressed/);
    assert.match(pin, /title=/);
    assert.match(dialog, /role="dialog"/);
    assert.match(dialog, /aria-modal="true"/);
    assert.match(listPage, /dir="rtl"/);
});

test('P9V-ARCH-006 immutable Phase 9-V backup manifest covers every copied file and all hashes match', async () => {
    const backupsRoot = resolve(process.cwd(), 'tamar-server/.local-backups');
    const backupNames = (await readdir(backupsRoot)).filter((name) => name.startsWith('phase9-baseline-before-phase9-v-')).sort();
    assert.ok(backupNames.length > 0);
    const backupRoot = resolve(backupsRoot, backupNames.at(-1));
    const manifest = await readFile(resolve(backupRoot, 'manifest.txt'), 'utf8');
    const hashRows = (await readFile(resolve(backupRoot, 'sha256.tsv'), 'utf8')).trim().split(/\r?\n/u);
    assert.match(manifest, /Total backup files including sha256\.tsv: 198/);
    assert.equal(hashRows.length, 197);
    for (const row of hashRows) {
        const [expected, relativePath] = row.split('\t');
        const content = await readFile(resolve(backupRoot, relativePath));
        assert.equal(createHash('sha256').update(content).digest('hex').toUpperCase(), expected, relativePath);
    }
});

test('P9V-ARCH-007 Phase 9-V does not introduce Phase 10 or forbidden Board features', async () => {
    const boardRoot = resolve(process.cwd(), 'src/features/tickets/boards');
    const collect = async (directory) => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? collect(path) : path;
    }))).flat();
    const productionFiles = (await collect(boardRoot)).filter((path) => !path.includes(`${String.fromCharCode(92)}__tests__${String.fromCharCode(92)}`));
    const source = (await Promise.all(productionFiles.map((path) => readFile(path, 'utf8')))).join('\n');
    assert.doesNotMatch(source, /typing indicator|read receipt|personal ordering|personal category|personal pin/i);
    assert.doesNotMatch(source, /socket\.(emit|send)\s*\(/);
});