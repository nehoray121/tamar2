const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { ROLES } = require('../src/domain/access/constants.js');
const { sanitizeFieldValues } = require('../src/modules/tickets/domain/fieldValues.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketSequence = require('../src/modules/tickets/models/TicketSequence.js');
const TicketAuthorizationService = require('../src/modules/tickets/services/TicketAuthorizationService.js');
const TicketCapabilityService = require('../src/modules/tickets/services/TicketCapabilityService.js');
const TicketRealtimePublisher = require('../src/modules/tickets/services/TicketRealtimePublisher.js');

const ids = () => ({
    systemId: new mongoose.Types.ObjectId(),
    environmentId: new mongoose.Types.ObjectId(),
    subEnvironmentId: new mongoose.Types.ObjectId(),
    currentRoomId: new mongoose.Types.ObjectId()
});
const membership = (role, ticket) => ({
    role,
    systemId: ticket.systemId,
    environmentId: ticket.environmentId,
    subEnvironmentId: ticket.subEnvironmentId,
    roomId: ticket.currentRoomId
});
const access = (memberships) => ({ isActive: true, memberships });

test('fieldValues accepts bounded JSON-safe plain objects and returns a prototype-safe copy', () => {
    const result = sanitizeFieldValues({ text: 'safe', nested: { list: [1, true, null] } });
    assert.equal(Object.getPrototypeOf(result), null);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { text: 'safe', nested: { list: [1, true, null] } });
});
test('fieldValues rejects a root array', () => assert.throws(() => sanitizeFieldValues([]), (error) => error.code === 'INVALID_FIELD_VALUES'));
test('fieldValues rejects non-finite numbers', () => assert.throws(() => sanitizeFieldValues({ value: Infinity }), (error) => error.code === 'INVALID_FIELD_VALUES'));
test('fieldValues rejects dangerous dollar and dotted keys', () => {
    for (const value of [{ $where: 'x' }, { 'a.b': 1 }]) assert.throws(() => sanitizeFieldValues(value), (error) => error.code === 'INVALID_FIELD_VALUES');
});
test('fieldValues rejects prototype-pollution keys parsed from JSON', () => {
    assert.throws(() => sanitizeFieldValues(JSON.parse('{"__proto__":{"polluted":true}}')), (error) => error.code === 'INVALID_FIELD_VALUES');
});
test('fieldValues rejects excessive depth, key count and serialized size', () => {
    assert.throws(() => sanitizeFieldValues({ a: { b: { c: { d: { e: 1 } } } } }));
    assert.throws(() => sanitizeFieldValues(Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`k${index}`, index]))));
    assert.throws(() => sanitizeFieldValues({ large: 'x'.repeat(66 * 1024) }));
});

test('Ticket schema is strict, version-key free and defines the required Phase 4 indexes', () => {
    assert.equal(Ticket.schema.options.strict, 'throw');
    assert.equal(Ticket.schema.options.versionKey, false);
    const names = new Set(Ticket.schema.indexes().map(([, options]) => options.name));
    for (const name of [
        'uniq_ticket_number', 'uniq_ticket_sequence_per_system', 'ticket_current_room_status_updated',
        'ticket_visible_room_status_updated', 'ticket_creator_status_updated', 'ticket_assignee_status_updated',
        'ticket_system_status_created', 'ticket_environment_status_updated',
        'ticket_sub_environment_status_updated', 'ticket_status_closed'
    ]) assert.ok(names.has(name), name);
});
test('TicketSequence and TicketHistory expose the required indexes', () => {
    assert.ok(TicketSequence.schema.indexes().some(([, options]) => options.name === 'uniq_ticket_sequence_system' && options.unique));
    const historyNames = new Set(TicketHistory.schema.indexes().map(([, options]) => options.name));
    for (const name of ['ticket_history_chronology', 'ticket_history_version', 'ticket_history_actor', 'ticket_history_event']) assert.ok(historyNames.has(name));
});

test('authorization maps each canonical role to its exact ticket scope', () => {
    const ticket = ids();
    const service = new TicketAuthorizationService({ scopeResolver: null });
    for (const role of Object.values(ROLES)) assert.equal(service.canView(access([membership(role, ticket)]), ticket), true);
    assert.equal(service.canView(access([{ ...membership(ROLES.ROOM_USER, ticket), roomId: new mongoose.Types.ObjectId() }]), ticket), false);
    assert.equal(service.canView(access([{ ...membership(ROLES.SYSTEM_ADMIN, ticket), subEnvironmentId: new mongoose.Types.ObjectId() }]), ticket), false);
});
test('ROOM_USER cannot edit but managers and administrators can', () => {
    const ticket = ids();
    const service = new TicketAuthorizationService({ scopeResolver: null });
    assert.equal(service.canEdit(access([membership(ROLES.ROOM_USER, ticket)]), ticket), false);
    for (const role of [ROLES.ROOM_MANAGER, ROLES.SYSTEM_ADMIN, ROLES.SUPER_ADMIN]) {
        assert.equal(service.canEdit(access([membership(role, ticket)]), ticket), true);
    }
});
test('capabilities expose only Phase 4 actions and close all mutations after closure', () => {
    const ticket = { ...ids(), status: 'OPEN' };
    const authorizationService = new TicketAuthorizationService({ scopeResolver: null });
    const capabilities = new TicketCapabilityService({ authorizationService });
    const roomUser = capabilities.forTicket(access([membership(ROLES.ROOM_USER, ticket)]), ticket);
    assert.equal(roomUser.canEdit, false);
    assert.equal(roomUser.canClose, true);
    for (const key of ['canAssign', 'canTransfer', 'canAcceptTransfer', 'canCancelTransfer', 'canChangeCategory', 'canChangePin', 'canWriteChat']) {
        assert.equal(roomUser[key], false);
    }
    const closed = capabilities.forTicket(access([membership(ROLES.ROOM_MANAGER, ticket)]), { ...ticket, status: 'CLOSED' });
    assert.equal(closed.isReadOnly, true);
    assert.equal(closed.readOnlyReason, 'TICKET_CLOSED');
    assert.equal(closed.canEdit, false);
    assert.equal(closed.canClose, false);
});

test('realtime publisher emits only bounded routing-safe ticket fields', () => {
    const emitted = [];
    const io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };
    const publisher = new TicketRealtimePublisher({ logger: { warn() {} } });
    publisher.setIo(io);
    publisher.publish('ticket:updated', {
        _id: 'ticket', ticketNumber: 'SYS-00000001', ...ids(), status: 'OPEN', version: 2,
        updatedAt: new Date(), description: 'secret', fieldValues: { secret: true }
    });
    const serialized = JSON.stringify(emitted);
    assert.doesNotMatch(serialized, /secret|description|fieldValues/);
    assert.ok(emitted.some((entry) => entry.room.startsWith('system:')));
    assert.ok(emitted.some((entry) => entry.room.startsWith('subEnvironment:')));
    assert.ok(emitted.some((entry) => entry.room.startsWith('room:')));
});
