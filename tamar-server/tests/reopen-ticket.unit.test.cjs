const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleCache = new Map();
const loadCommonJs = (filename) => {
    const resolved = path.resolve(filename);
    if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;

    const code = fs.readFileSync(resolved, 'utf8');
    const module = { exports: {} };
    moduleCache.set(resolved, module);

    const localRequire = (request) => {
        if (!request.startsWith('.')) return require(request);
        let target = path.resolve(path.dirname(resolved), request);
        if (!path.extname(target)) target += '.js';
        return loadCommonJs(target);
    };

    const wrapper = vm.runInThisContext(
        `(function (require, module, exports, __filename, __dirname) {${code}
})`,
        { filename: resolved }
    );
    wrapper(
        localRequire,
        module,
        module.exports,
        resolved,
        path.dirname(resolved)
    );
    return module.exports;
};

const TicketAuthorizationService = loadCommonJs(
    path.join(
        __dirname,
        '../src/modules/tickets/services/TicketAuthorizationService.js'
    )
);
const TicketCapabilityService = loadCommonJs(
    path.join(
        __dirname,
        '../src/modules/tickets/services/TicketCapabilityService.js'
    )
);
const TicketService = loadCommonJs(
    path.join(
        __dirname,
        '../src/modules/tickets/services/TicketService.js'
    )
);
const { ROLES } = loadCommonJs(
    path.join(__dirname, '../src/domain/access/constants.js')
);

const closedTicket = (overrides = {}) => ({
    _id: 'ticket-1',
    ticketNumber: 'SYS-00000001',
    sequenceNumber: 1,
    systemId: 'system-1',
    environmentId: 'environment-1',
    subEnvironmentId: 'sub-environment-1',
    originalRoomId: 'room-1',
    currentRoomId: 'room-1',
    visibleRoomIds: ['room-1'],
    subject: 'בדיקת פתיחה מחדש',
    description: 'תיאור',
    priority: 'MEDIUM',
    fieldValues: {
        treatment: 'טופל במקום',
        status: 'סגורה',
        closingDate: '2026-09-03',
        phone: '0500000000'
    },
    status: 'CLOSED',
    createdBy: 'user-creator',
    activeAssigneeIds: ['user-1'],
    activeTransferId: null,
    closedBy: 'user-closer',
    closedAt: new Date('2026-09-03T08:00:00.000Z'),
    closureSummary: 'הטיפול הסתיים',
    version: 7,
    createdAt: new Date('2026-09-01T08:00:00.000Z'),
    updatedAt: new Date('2026-09-03T08:00:00.000Z'),
    ...overrides
});

const accessFor = (roomId = 'room-1') => ({
    isActive: true,
    roomIds: [roomId],
    managedRoomIds: [],
    memberships: [{
        role: ROLES.ROOM_USER,
        roomId,
        systemId: 'system-1',
        environmentId: 'environment-1',
        subEnvironmentId: 'sub-environment-1'
    }]
});

const createService = ({
    ticket = closedTicket(),
    access = accessFor(),
    reopened = null
} = {}) => {
    const history = [];
    const realtime = [];
    const repositoryCalls = [];
    const authorizationService = new TicketAuthorizationService({
        scopeResolver: {
            resolveEffectiveAccess: async () => access
        }
    });
    const capabilityService = new TicketCapabilityService({
        authorizationService
    });
    const reopenedTicket = reopened || {
        ...ticket,
        status: 'OPEN',
        closedBy: null,
        closedAt: null,
        closureSummary: null,
        fieldValues: {
            phone: ticket.fieldValues?.phone
        },
        version: ticket.version + 1
    };

    const service = new TicketService({
        organization: {
            integrityService: {
                resolveRoom: async () => ({
                    system: { _id: 'system-1' },
                    environment: { _id: 'environment-1' },
                    subEnvironment: { _id: 'sub-environment-1' },
                    room: { _id: ticket.currentRoomId },
                    systemKey: 'SYS'
                })
            }
        },
        ticketRepository: {
            findById: async () => ticket,
            reopen: async (...args) => {
                repositoryCalls.push(args);
                return reopenedTicket;
            }
        },
        historyRepository: {
            append: async (payload) => history.push(payload)
        },
        authorizationService,
        capabilityService,
        transactionRunner: {
            run: async (callback) => callback('session-1')
        },
        realtimePublisher: {
            publish: (event, payload) => realtime.push({ event, payload })
        },
        assigneeSummaryService: {
            forTicket: async () => []
        }
    });

    return {
        service,
        authorizationService,
        capabilityService,
        history,
        realtime,
        repositoryCalls,
        reopenedTicket
    };
};

test('every active current-room member can reopen a closed ticket', () => {
    const ticket = closedTicket();
    const authorizationService = new TicketAuthorizationService({
        scopeResolver: null
    });

    assert.equal(
        authorizationService.canReopen(accessFor(), ticket),
        true
    );
    assert.equal(
        authorizationService.canReopen(
            accessFor('room-previous'),
            {
                ...ticket,
                visibleRoomIds: ['room-previous', 'room-1']
            }
        ),
        false
    );
    assert.equal(
        authorizationService.canReopen(
            accessFor(),
            { ...ticket, status: 'OPEN' }
        ),
        false
    );
});

test('closed ticket remains read-only but exposes canReopen', () => {
    const ticket = closedTicket();
    const authorizationService = new TicketAuthorizationService({
        scopeResolver: null
    });
    const capabilityService = new TicketCapabilityService({
        authorizationService
    });
    const capabilities = capabilityService.forTicket(
        accessFor(),
        ticket
    );

    assert.equal(capabilities.canReopen, true);
    assert.equal(capabilities.canEdit, false);
    assert.equal(capabilities.canClose, false);
    assert.equal(capabilities.isReadOnly, true);
    assert.equal(capabilities.readOnlyReason, 'TICKET_CLOSED');
});

test('reopen clears lifecycle state and appends a privacy-safe audit event', async () => {
    const context = createService();
    const result = await context.service.reopen(
        'user-1',
        'ticket-1',
        7
    );

    assert.equal(context.repositoryCalls.length, 1);
    assert.equal(context.repositoryCalls[0][0], 'ticket-1');
    assert.equal(context.repositoryCalls[0][1], 7);
    assert.deepEqual(context.repositoryCalls[0][2], {
        session: 'session-1'
    });

    assert.equal(result.status, 'OPEN');
    assert.equal(result.closure, null);
    assert.equal(result.fieldValues.treatment, undefined);
    assert.deepEqual(result.activeAssigneeIds, ['user-1']);

    assert.equal(context.history.length, 1);
    assert.equal(context.history[0].eventType, 'TICKET_REOPENED');
    assert.deepEqual(context.history[0].changes, {
        status: {
            before: 'CLOSED',
            after: 'OPEN'
        }
    });
    assert.equal(
        context.history[0].metadata.treatmentCleared,
        true
    );
    assert.ok(
        context.history[0].changedFields.includes(
            'fieldValues.treatment'
        )
    );

    const serializedHistory = JSON.stringify(context.history[0]);
    assert.doesNotMatch(serializedHistory, /טופל במקום/u);
    assert.doesNotMatch(serializedHistory, /הטיפול הסתיים/u);

    assert.deepEqual(
        context.realtime.map((entry) => entry.event),
        ['ticket:reopened', 'ticket:history:created']
    );
});

test('reopen rejects non-closed, forbidden and stale tickets', async () => {
    await assert.rejects(
        createService({
            ticket: closedTicket({ status: 'OPEN' })
        }).service.reopen('user-1', 'ticket-1', 7),
        (error) => error.code === 'TICKET_NOT_CLOSED'
    );

    await assert.rejects(
        createService({
            access: accessFor('room-previous'),
            ticket: closedTicket({
                visibleRoomIds: ['room-previous', 'room-1']
            })
        }).service.reopen('user-1', 'ticket-1', 7),
        (error) => error.code === 'TICKET_REOPEN_FORBIDDEN'
    );

    await assert.rejects(
        createService().service.reopen(
            'user-1',
            'ticket-1',
            6
        ),
        (error) => error.code === 'VERSION_CONFLICT'
    );
});

test('repository and route contracts clear all canonical closure fields', () => {
    const root = path.resolve(__dirname, '..');
    const repository = fs.readFileSync(
        path.join(
            root,
            'src/modules/tickets/repositories/TicketRepository.js'
        ),
        'utf8'
    );
    const route = fs.readFileSync(
        path.join(root, 'src/routes/tickets.routes.js'),
        'utf8'
    );

    assert.match(repository, /async reopen\(/u);
    assert.match(repository, /status: 'OPEN'/u);
    assert.match(repository, /closedBy: null/u);
    assert.match(repository, /closedAt: null/u);
    assert.match(repository, /closureSummary: null/u);
    assert.match(repository, /'fieldValues\.treatment': 1/u);
    assert.match(repository, /'fieldValues\.status': 1/u);
    assert.match(repository, /'fieldValues\.closingDate': 1/u);
    assert.match(route, /router\.post\('\/:id\/reopen'/u);
    assert.match(route, /parseReopenTicket/u);
});
