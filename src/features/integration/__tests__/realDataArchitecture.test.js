import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../../..');

test('production source passes the real-data static verifier', () => {
    const output = execFileSync(process.execPath, ['scripts/verify-real-data-integration.cjs'], {
        cwd: root,
        encoding: 'utf8'
    });
    assert.match(output, /verification passed/u);
});

test('canonical feature pages reference shared authenticated domain APIs', async () => {
    const expectations = new Map([
        ['src/pages/DashboardPage/DashboardPage.jsx', 'useDashboardData'],
        ['src/pages/UserManagementPage/UserManagementPage.jsx', 'useUserManagement'],
        ['src/pages/AccessRequestsPage/AccessRequestsPage.jsx', 'accessRequestsApi'],
        ['src/pages/TicketListPage/TicketModal.jsx', 'ticketsApi.get'],
        ['src/features/tickets/hooks/useMyTasks.js', 'ticketsApi.list'],
        ['src/pages/HierarchyPage/HierarchyPage.jsx', 'useRoomHierarchy']
    ]);
    for (const [file, marker] of expectations) {
        const source = await fs.readFile(path.join(root, file), 'utf8');
        assert.ok(source.includes(marker), `${file} must use ${marker}`);
    }
});
