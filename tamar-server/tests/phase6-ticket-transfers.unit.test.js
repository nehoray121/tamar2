const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { ROLES } = require('../src/domain/access/constants.js');
const TicketTransfer = require('../src/modules/tickets/transfers/models/TicketTransfer.js');
const TicketAuthorizationService = require('../src/modules/tickets/services/TicketAuthorizationService.js');
const TicketCapabilityService = require('../src/modules/tickets/services/TicketCapabilityService.js');
const TicketTransferRealtimePublisher = require('../src/modules/tickets/transfers/services/TicketTransferRealtimePublisher.js');
const { deriveExternalState } = require('../src/modules/tickets/transfers/domain/transfer.dto.js');
const { TRANSFER_STATUSES } = require('../src/modules/tickets/transfers/domain/transfer.constants.js');
const {
    parseAcceptTransfer, parseCancelTransfer, parseInitiateTransfer,
    parseTransferHistoryQuery, parseTransferListQuery, parseTransferTargetsQuery
} = require('../src/modules/tickets/transfers/domain/transfer.validators.js');

const objectId = () => new mongoose.Types.ObjectId();
const baseTransfer = (overrides = {}) => {
    const sourceRoomId = objectId();
    return {
        ticketId: objectId(), ticketNumber: 'TMR-00000001', systemId: objectId(),
        sourceEnvironmentId: objectId(), sourceSubEnvironmentId: objectId(), sourceRoomId,
        destinationEnvironmentId: objectId(), destinationSubEnvironmentId: objectId(), destinationRoomId: objectId(),
        status: TRANSFER_STATUSES.PENDING_ACCEPTANCE, initiatedBy: objectId(), initiatedAt: new Date(),
        transferReason: 'Operational handoff', ticketVersionBeforeInitiation: 1,
        ticketVersionAfterInitiation: 2, sequence: 1, metadata: {}, ...overrides
    };
};
const runMiddleware = (middleware, request) => new Promise((resolve, reject) => {
    middleware(request, {}, (error) => error ? reject(error) : resolve(request));
});

test('TicketTransfer is strict, version-key free and exposes all focused Phase 6 indexes', () => {
    assert.equal(TicketTransfer.schema.options.strict, 'throw');
    assert.equal(TicketTransfer.schema.options.versionKey, false);
    const indexes = new Map(TicketTransfer.schema.indexes().map(([fields, options]) => [options.name, { fields, options }]));
    for (const name of [
        'uniq_pending_transfer_per_ticket', 'uniq_transfer_sequence_per_ticket', 'transfer_ticket_history',
        'transfer_incoming_room_queue', 'transfer_outgoing_room_queue',
        'transfer_incoming_sub_environment_queue', 'transfer_outgoing_sub_environment_queue',
        'transfer_system_history', 'transfer_initiator_history'
    ]) assert.ok(indexes.has(name), name);
    assert.equal(indexes.get('uniq_pending_transfer_per_ticket').options.unique, true);
    assert.deepEqual(indexes.get('uniq_pending_transfer_per_ticket').options.partialFilterExpression, {
        status: TRANSFER_STATUSES.PENDING_ACCEPTANCE
    });
    assert.equal(indexes.get('uniq_transfer_sequence_per_ticket').options.unique, true);
});

test('TicketTransfer enforces pending, accepted and cancelled state invariants', async () => {
    await new TicketTransfer(baseTransfer()).validate();
    await new TicketTransfer(baseTransfer({
        status: TRANSFER_STATUSES.ACCEPTED, acceptedBy: objectId(), acceptedAt: new Date()
    })).validate();
    await new TicketTransfer(baseTransfer({
        status: TRANSFER_STATUSES.CANCELLED, cancelledBy: objectId(), cancelledAt: new Date(),
        cancellationReason: 'Destination cannot own this ticket'
    })).validate();
    await assert.rejects(new TicketTransfer(baseTransfer({ acceptedBy: objectId() })).validate());
    await assert.rejects(new TicketTransfer(baseTransfer({ status: TRANSFER_STATUSES.ACCEPTED })).validate());
    await assert.rejects(new TicketTransfer(baseTransfer({ status: TRANSFER_STATUSES.CANCELLED })).validate());
    const sameRoom = objectId();
    await assert.rejects(new TicketTransfer(baseTransfer({ sourceRoomId: sameRoom, destinationRoomId: sameRoom })).validate());
});

test('transfer request validators reject protected fields, short reasons and unsafe list queries', async () => {
    await runMiddleware(parseInitiateTransfer, {
        body: { destinationRoomId: String(objectId()), reason: 'Valid transfer reason' }
    });
    await assert.rejects(runMiddleware(parseInitiateTransfer, {
        body: { destinationRoomId: String(objectId()), reason: 'Valid reason', status: 'ACCEPTED' }
    }));
    await assert.rejects(runMiddleware(parseCancelTransfer, { body: { reason: 'x' } }),
        (error) => error.code === 'INVALID_CANCELLATION_REASON');
    await runMiddleware(parseAcceptTransfer, { body: {} });
    await assert.rejects(runMiddleware(parseAcceptTransfer, { body: { acceptedBy: String(objectId()) } }));
    await assert.rejects(runMiddleware(parseTransferListQuery, { query: { unknown: 'value' } }));
    await assert.rejects(runMiddleware(parseTransferListQuery, {
        query: { initiatedFrom: '2026-07-20T10:00:00Z', initiatedTo: '2026-07-19T10:00:00Z' }
    }));
    await assert.rejects(runMiddleware(parseTransferHistoryQuery, { query: { limit: '101' } }));
    await assert.rejects(runMiddleware(parseTransferTargetsQuery, { query: { page: '0' } }));
});

test('external transfer state is derived without storing PROCESSING or DONE', () => {
    assert.equal(deriveExternalState({ status: TRANSFER_STATUSES.PENDING_ACCEPTANCE }, { status: 'OPEN' }), 'PENDING');
    assert.equal(deriveExternalState({ status: TRANSFER_STATUSES.ACCEPTED }, { status: 'OPEN' }), 'PROCESSING');
    assert.equal(deriveExternalState({ status: TRANSFER_STATUSES.ACCEPTED }, { status: 'CLOSED' }), 'DONE');
    assert.equal(deriveExternalState({ status: TRANSFER_STATUSES.CANCELLED }, { status: 'OPEN' }), 'CANCELLED');
});

test('pending transfer capabilities isolate source, destination user and destination manager authority', () => {
    const sourceRoomId = objectId();
    const destinationRoomId = objectId();
    const systemId = objectId();
    const subEnvironmentId = objectId();
    const ticket = {
        systemId, subEnvironmentId, currentRoomId: destinationRoomId,
        visibleRoomIds: [sourceRoomId, destinationRoomId], activeTransferId: objectId(), status: 'OPEN'
    };
    const transfer = { sourceRoomId, destinationRoomId };
    const authorization = new TicketAuthorizationService({ scopeResolver: null });
    const capabilities = new TicketCapabilityService({ authorizationService: authorization });
    const access = (role, roomId, managed = false) => ({
        isActive: true, roomIds: [roomId], managedRoomIds: managed ? [roomId] : [],
        memberships: [{ role, systemId, subEnvironmentId, roomId }]
    });
    const source = capabilities.forTicket(access(ROLES.ROOM_MANAGER, sourceRoomId, true), ticket, transfer);
    assert.equal(source.canView, true);
    assert.equal(source.canEdit, false);
    assert.equal(source.canCancelTransfer, false);
    assert.equal(source.readOnlyReason, 'TRANSFER_PENDING_ACCEPTANCE');
    const roomUser = capabilities.forTicket(access(ROLES.ROOM_USER, destinationRoomId), ticket, transfer);
    assert.equal(roomUser.canView, true);
    assert.equal(roomUser.canAcceptTransfer, false);
    const manager = capabilities.forTicket(access(ROLES.ROOM_MANAGER, destinationRoomId, true), ticket, transfer);
    assert.equal(manager.canAcceptTransfer, true);
    assert.equal(manager.canCancelTransfer, true);
    assert.equal(manager.canEdit, false);
    assert.equal(manager.canAssign, false);
    assert.equal(manager.canTransfer, false);
});

test('transfer realtime payload is bounded, routing-safe and reaches both organizational sides', () => {
    const emitted = [];
    const io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };
    const publisher = new TicketTransferRealtimePublisher({ logger: { warn() {} } });
    publisher.setIo(io);
    const transfer = baseTransfer({ _id: objectId() });
    publisher.publish('transfer:initiated', transfer, { status: 'OPEN', version: 2 }, { endedAssigneeCount: 2 });
    const rooms = new Set(emitted.map((item) => item.room));
    assert.ok(rooms.has(`room:${transfer.sourceRoomId}`));
    assert.ok(rooms.has(`room:${transfer.destinationRoomId}`));
    assert.ok(emitted.some((item) => item.event === 'transfer:initiated'));
    assert.ok(emitted.some((item) => item.event === 'ticket:updated'));
    assert.ok(emitted.some((item) => item.event === 'assignment:updated'));
    const serialized = JSON.stringify(emitted);
    assert.doesNotMatch(serialized, /transferReason|cancellationReason|description|fieldValues|personalNumber|accessToken|claims/);
});
