const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const mongoose = require('mongoose');
const TicketAssignment = require('../src/modules/tickets/models/TicketAssignment.js');
const {
    parseAssignableUsersQuery, parseAssignmentsQuery, parseBulkAssignees, parseReplaceAssignees
} = require('../src/modules/tickets/validation/assignmentValidation.js');
const TicketAssignmentRealtimePublisher = require('../src/modules/tickets/services/TicketAssignmentRealtimePublisher.js');

const objectId = () => new mongoose.Types.ObjectId();
const invoke = (middleware, request) => new Promise((resolve, reject) => middleware(request, {}, (error) => error ? reject(error) : resolve(request)));

test('TicketAssignment validates active and ended state invariants', async () => {
    const base = {
        ticketId: objectId(), ticketNumber: 'SYS-00000001', systemId: objectId(), environmentId: objectId(),
        subEnvironmentId: objectId(), roomId: objectId(), userId: objectId(), assignedBy: objectId(),
        assignedAt: new Date(), assignmentSource: 'SINGLE', metadata: {}
    };
    await new TicketAssignment({ ...base, isActive: true }).validate();
    await assert.rejects(new TicketAssignment({ ...base, isActive: true, endedAt: new Date(), endedReason: 'MANUAL_REMOVAL', endedBy: objectId() }).validate());
    await assert.rejects(new TicketAssignment({ ...base, isActive: false, endedAt: new Date(), endedReason: 'MANUAL_REMOVAL' }).validate());
    await new TicketAssignment({ ...base, isActive: false, endedAt: new Date(), endedReason: 'MANUAL_REMOVAL', endedBy: objectId() }).validate();
});

test('single assignment body is strict, bounded and deduplicated', async () => {
    const id = String(objectId());
    const request = await invoke(parseReplaceAssignees, { body: { assigneeIds: [id, id] } });
    assert.deepEqual(request.assignmentInput.assigneeIds, [id]);
    await assert.rejects(invoke(parseReplaceAssignees, { body: { assigneeIds: [], roomId: id } }), (error) => error.code === 'VALIDATION_ERROR');
    await assert.rejects(invoke(parseReplaceAssignees, { body: { assigneeIds: Array.from({ length: 51 }, () => id) } }), (error) => error.code === 'VALIDATION_ERROR');
});

test('assignable-users and assignment-history queries reject unknown or unsafe values', async () => {
    const assignable = await invoke(parseAssignableUsersQuery, { query: { page: '2', limit: '10', includeAssigned: 'false', search: 'Alice' } });
    assert.deepEqual(assignable.assignmentQuery, { page: 2, limit: 10, includeAssigned: false, search: 'Alice' });
    const history = await invoke(parseAssignmentsQuery, { query: { view: 'HISTORY', sortDirection: 'desc' } });
    assert.equal(history.assignmentQuery.limit, 50);
    await assert.rejects(invoke(parseAssignableUsersQuery, { query: { personalNumber: '1234567' } }), (error) => error.code === 'VALIDATION_ERROR');
    await assert.rejects(invoke(parseAssignmentsQuery, { query: { view: 'DELETED' } }), (error) => error.code === 'VALIDATION_ERROR');
});

test('bulk parser enforces operation cardinality, versions and unique Ticket IDs', async () => {
    const ticketId = String(objectId());
    const assigneeId = String(objectId());
    const valid = await invoke(parseBulkAssignees, { body: {
        operation: 'ADD', tickets: [{ ticketId, expectedVersion: 1 }], assigneeIds: [assigneeId]
    } });
    assert.equal(valid.assignmentInput.operation, 'ADD');
    await assert.rejects(invoke(parseBulkAssignees, { body: {
        operation: 'ADD', tickets: [{ ticketId, expectedVersion: 0 }], assigneeIds: [assigneeId]
    } }), (error) => error.code === 'VALIDATION_ERROR');
    await assert.rejects(invoke(parseBulkAssignees, { body: {
        operation: 'ADD', tickets: [{ ticketId, expectedVersion: 1 }, { ticketId, expectedVersion: 1 }], assigneeIds: [assigneeId]
    } }), (error) => error.code === 'VALIDATION_ERROR');
    const replace = await invoke(parseBulkAssignees, { body: {
        operation: 'REPLACE', tickets: [{ ticketId, expectedVersion: 1 }], assigneeIds: []
    } });
    assert.deepEqual(replace.assignmentInput.assigneeIds, []);
});

test('assignment realtime event is routing-safe and excludes names and Ticket body', () => {
    const emissions = [];
    const io = { to: (room) => ({ emit: (event, payload) => emissions.push({ room, event, payload }) }) };
    const publisher = new TicketAssignmentRealtimePublisher({ logger: { warn() {} } });
    publisher.setIo(io);
    publisher.publish({
        ticket: {
            _id: objectId(), ticketNumber: 'SYS-00000001', systemId: objectId(), subEnvironmentId: objectId(),
            currentRoomId: objectId(), version: 2, activeAssigneeIds: [objectId()], updatedAt: new Date(),
            subject: 'secret', description: 'secret', fieldValues: { secret: true }
        },
        addedIds: [String(objectId())], removedIds: []
    });
    assert.equal(emissions.length, 3);
    assert.ok(emissions.every((item) => item.event === 'assignment:updated'));
    const serialized = JSON.stringify(emissions);
    assert.doesNotMatch(serialized, /subject|description|fieldValues|displayName|email|personalNumber/i);
    assert.match(serialized, /activeAssigneeCount/);
});

test('Phase 5 OpenAPI is valid JSON-compatible OpenAPI 3.1 and documents only assignment endpoints', async () => {
    const document = JSON.parse(await readFile(path.join(__dirname, '../docs/openapi/tickets-phase5-assignments.yaml'), 'utf8'));
    assert.equal(document.openapi, '3.1.0');
    assert.deepEqual(Object.keys(document.paths).sort(), [
        '/tickets/bulk/assignees', '/tickets/{id}/assignable-users', '/tickets/{id}/assignees', '/tickets/{id}/assignments'
    ]);
    assert.ok(document.paths['/tickets/{id}/assignees'].put.responses['428']);
    assert.equal(document.components.schemas.ReplaceAssigneesRequest.additionalProperties, false);
    assert.equal(document.components.schemas.BulkAssigneesRequest.properties.tickets.maxItems, 50);
});

test('central Assignment router exposes all Phase 5 routes without transfer or assign-me', async () => {
    const source = await readFile(path.join(__dirname, '../src/routes/ticketAssignments.routes.js'), 'utf8');
    for (const route of [
        "router.put('/:id/assignees'", "router.get('/:id/assignable-users'",
        "router.get('/:id/assignments'", "router.post('/bulk/assignees'"
    ]) assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(source, /assign-me|transfer/i);
});
