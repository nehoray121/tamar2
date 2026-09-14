import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..'
);
const source = (relative) => readFile(
    path.join(root, relative),
    'utf8'
);

test('reopen frontend calls the canonical endpoint with optimistic concurrency', async () => {
    const service = await source(
        'src/features/tickets/services/reopenInquiryService.js'
    );

    assert.match(service, /\/api\/tickets\/\$\{encodeURIComponent\(inquiryId\)\}\/reopen/u);
    assert.match(service, /method: 'POST'/u);
    assert.match(service, /'If-Match'/u);
    assert.match(service, /body: \{\}/u);
});

test('history rows and details expose reopen only through server capability', async () => {
    const [row, list, modal] = await Promise.all([
        source('src/features/tickets/components/InquiryListRow.jsx'),
        source('src/pages/TicketListPage/TicketListPage.jsx'),
        source('src/pages/TicketListPage/TicketModal.jsx')
    ]);

    assert.match(row, /viewType === 'history'/u);
    assert.match(row, /data-testid="board-item-reopen"/u);
    assert.match(row, /icon="refresh"/u);
    assert.match(list, /task\.capabilities\?\.canReopen/u);
    assert.match(list, /<ReopenInquiryDialog/u);
    assert.match(modal, /serverCapabilities\.canReopen/u);
    assert.match(modal, /החזרה לפתוחות/u);
});

test('reopen confirmation explains lifecycle clearing and audit preservation', async () => {
    const dialog = await source(
        'src/features/tickets/components/ReopenInquiryDialog.jsx'
    );

    assert.match(dialog, /אופן הטיפול/u);
    assert.match(dialog, /תאריך הסגירה/u);
    assert.match(dialog, /אירוע הסגירה הקודם יישמר בהיסטוריה/u);
    assert.match(dialog, /confirm-reopen-inquiry/u);
});

test('board API carries canReopen and realtime refreshes open/history boards', async () => {
    const [dto, query, socket, container] = await Promise.all([
        source('tamar-server/src/modules/tickets/boards/domain/board.dto.js'),
        source('tamar-server/src/modules/tickets/boards/services/TicketBoardQueryService.js'),
        source('src/features/tickets/boards/realtime/boardSocket.js'),
        source('tamar-server/src/services/createServiceContainer.js')
    ]);

    assert.match(dto, /capabilities: capabilities \|\| \{\}/u);
    assert.match(query, /ticketCapabilityService\.forTicket/u);
    assert.match(container, /ticketCapabilityService,/u);
    assert.match(socket, /'ticket:reopened'/u);
});

test('backend reopen is room-access scoped and clears treatment/closure data', async () => {
    const [authorization, repository, ticketService, constants] = await Promise.all([
        source('tamar-server/src/modules/tickets/services/TicketAuthorizationService.js'),
        source('tamar-server/src/modules/tickets/repositories/TicketRepository.js'),
        source('tamar-server/src/modules/tickets/services/TicketService.js'),
        source('tamar-server/src/modules/tickets/domain/constants.js')
    ]);

    assert.match(authorization, /canReopen\(access, ticket\)/u);
    assert.match(authorization, /canAccessCurrentRoom\(access, ticket\)/u);
    assert.match(repository, /'fieldValues\.treatment': 1/u);
    assert.match(repository, /closedAt: null/u);
    assert.match(ticketService, /TICKET_HISTORY_EVENTS\.REOPENED/u);
    assert.match(constants, /REOPENED: 'TICKET_REOPENED'/u);
});
