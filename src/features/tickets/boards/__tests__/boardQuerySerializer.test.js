import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeBoardQuery } from '../api/boardQuerySerializer.js';

test('serializes only ticket-board filters for OPEN and drops personal ordering data', () => {
    const query = new URLSearchParams(serializeBoardQuery('OPEN', {
        page: 2,
        priority: 'HIGH',
        transferStatus: 'PENDING_ACCEPTANCE',
        manualOrder: 'ticket-2,ticket-1',
        userId: 'user-1'
    }));
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('priority'), 'HIGH');
    assert.equal(query.has('transferStatus'), false);
    assert.equal(query.has('manualOrder'), false);
    assert.equal(query.has('userId'), false);
});

test('serializes external priority and transfer filters while dropping ticket-only dates', () => {
    const query = new URLSearchParams(serializeBoardQuery('EXTERNAL_RECEIVED', {
        externalState: 'PROCESSING',
        priority: 'LOW',
        createdFrom: '2026-01-01',
        pinMode: 'PINNED'
    }));
    assert.equal(query.get('externalState'), 'PROCESSING');
    assert.equal(query.get('pinMode'), 'PINNED');
    assert.equal(query.get('priority'), 'LOW');
    assert.equal(query.has('createdFrom'), false);
});
