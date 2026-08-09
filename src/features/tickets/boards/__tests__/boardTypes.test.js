import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_TYPES, resolveBoardTypeFromView } from '../domain/boardTypes.js';

test('maps every supported frontend view to its canonical Room Board', () => {
    assert.equal(resolveBoardTypeFromView({ viewType: 'open' }), BOARD_TYPES.OPEN);
    assert.equal(resolveBoardTypeFromView({ viewType: 'history' }), BOARD_TYPES.CLOSED);
    assert.equal(resolveBoardTypeFromView({ viewType: 'external', toggleState: 'sent' }), BOARD_TYPES.EXTERNAL_SENT);
    assert.equal(resolveBoardTypeFromView({ viewType: 'external', toggleState: 'received' }), BOARD_TYPES.EXTERNAL_RECEIVED);
    assert.equal(resolveBoardTypeFromView({ viewType: 'dashboard' }), null);
});
