import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..'
);
const read = (relativePath) => fs.readFileSync(
    path.join(root, relativePath),
    'utf8'
);

test('frontend exposes the complete transfer workflow', () => {
    const api = read('src/features/tickets/api/ticketsApi.js');
    const modal = read('src/pages/TicketListPage/TicketModal.jsx');

    assert.match(api, /acceptTransfer\s*\(/);
    assert.match(api, /cancelTransfer\s*\(/);
    assert.match(api, /\/api\/ticket-transfers\/\$\{encode\(transferId\)\}\/accept/);
    assert.match(api, /\/api\/ticket-transfers\/\$\{encode\(transferId\)\}\/cancel/);
    assert.match(modal, /קבלת פנייה/);
    assert.match(modal, /ביטול העברה/);
});

test('incoming sidebar badge is data-driven and realtime', () => {
    const hook = read(
        'src/features/tickets/hooks/useExternalReceivedBadge.js'
    );
    const shell = read('src/components/layout/AppShell.jsx');

    assert.match(hook, /EXTERNAL_RECEIVED/);
    assert.match(hook, /externalState:\s*'PENDING'/);
    assert.match(hook, /externalState:\s*'PROCESSING'/);
    assert.match(hook, /subscribeBoardRealtime/);
    assert.match(shell, /useExternalReceivedBadge/);
    assert.doesNotMatch(shell, /badge:\s*'0'/);
});

test('room settings and role routes are guarded in both UI and API architecture', () => {
    const routes = read('src/app/AppRoutes.jsx');
    const roles = read('src/features/users/constants/userRoles.js');
    const hierarchyApi = read(
        'src/features/rooms/services/organizationHierarchyApi.js'
    );

    assert.match(routes, /canManageSettings/);
    assert.match(roles, /ENVIRONMENT_ADMIN/);
    assert.match(
        hierarchyApi,
        /\/api\/systems\/\$\{encode\(systemId\)\}\/environments/
    );
});

test('external statuses match the product language', () => {
    const adapter = read(
        'src/features/tickets/boards/domain/boardItemAdapter.js'
    );
    const row = read(
        'src/features/tickets/components/InquiryListRow.jsx'
    );

    assert.match(adapter, /PENDING:\s*'processing'/);
    assert.match(adapter, /PROCESSING:\s*'processing'/);
    assert.match(adapter, /DONE:\s*'done'/);
    assert.match(adapter, /CANCELLED:\s*'cancelled'/);
    assert.match(row, /label:\s*'בטיפול'/);
    assert.match(row, /label:\s*'טופלה'/);
    assert.match(row, /label:\s*'בוטלה'/);
});
