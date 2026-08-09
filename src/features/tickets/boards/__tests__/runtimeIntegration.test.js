import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRuntimeOrganizationApi } from '../../../rooms/services/runtimeOrganizationApi.js';
import { deriveInquiryRuntimeState, INQUIRY_RUNTIME_STATE } from '../domain/inquiryRuntimeState.js';
import { toBoardRuntimeError } from '../hooks/useTicketBoard.js';

const objectId = (digit) => String(digit).repeat(24);
const base = {
    boardType: 'OPEN',
    authStatus: 'authenticated',
    roomId: objectId(4),
    roomName: 'חדר אמת',
    loaded: true,
    loading: false,
    refreshing: false,
    error: null,
    itemCount: 1,
    hasActiveFilters: false
};
const state = (overrides = {}) => deriveInquiryRuntimeState({ ...base, ...overrides });

test('RTI-STATE-001 unsupported view is a blocking context state', () => assert.equal(state({ boardType: null }).kind, INQUIRY_RUNTIME_STATE.CONTEXT_ERROR));
test('RTI-STATE-002 authentication initialization is not reported as Room failure', () => assert.equal(state({ authStatus: 'initializing', roomId: '' }).kind, INQUIRY_RUNTIME_STATE.AUTH_LOADING));
test('RTI-STATE-003 missing SSO is an authentication error', () => assert.equal(state({ authStatus: 'unavailable', roomId: '', authError: 'SSO חסר' }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-004 expired SSO is an authentication error', () => assert.equal(state({ authStatus: 'expired' }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-005 failed authentication is an authentication error', () => assert.equal(state({ authStatus: 'failed' }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-006 authenticated session without Room gets only Room context state', () => assert.equal(state({ roomId: '' }).kind, INQUIRY_RUNTIME_STATE.CONTEXT_ERROR));
test('RTI-STATE-007 initial Board load is blocking', () => assert.equal(state({ loaded: false, loading: true, itemCount: 0 }).kind, INQUIRY_RUNTIME_STATE.INITIAL_LOADING));
test('RTI-STATE-008 unresolved initial Board lifecycle remains loading', () => assert.equal(state({ loaded: false, loading: false, itemCount: 0 }).kind, INQUIRY_RUNTIME_STATE.INITIAL_LOADING));
test('RTI-STATE-009 initial API failure is not an empty state', () => assert.equal(state({ loaded: false, itemCount: 0, error: { message: 'נכשל' } }).kind, INQUIRY_RUNTIME_STATE.API_ERROR));
test('RTI-STATE-010 network error preserves API classification', () => assert.equal(state({ loaded: false, itemCount: 0, error: { code: 'BOARD_NETWORK_ERROR', message: 'רשת' } }).kind, INQUIRY_RUNTIME_STATE.API_ERROR));
test('RTI-STATE-011 401 Board error is authentication state', () => assert.equal(state({ loaded: false, error: { status: 401, authorization: true, message: 'פג' } }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-012 403 Board error is authorization state', () => assert.equal(state({ loaded: false, error: { status: 403, authorization: true, message: 'אסור' } }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-013 unavailable token from Board is authentication state', () => assert.equal(state({ loaded: false, error: { code: 'AUTH_TOKEN_UNAVAILABLE', message: 'חסר' } }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-014 successful zero response is global empty', () => assert.equal(state({ itemCount: 0 }).kind, INQUIRY_RUNTIME_STATE.EMPTY));
test('RTI-STATE-015 successful filtered zero response is filtered empty', () => assert.equal(state({ itemCount: 0, hasActiveFilters: true }).kind, INQUIRY_RUNTIME_STATE.FILTERED_EMPTY));
test('RTI-STATE-016 successful item response is ready', () => assert.equal(state().kind, INQUIRY_RUNTIME_STATE.READY));
test('RTI-STATE-017 background refresh with data stays ready', () => assert.equal(state({ refreshing: true }).kind, INQUIRY_RUNTIME_STATE.READY));
test('RTI-STATE-018 failed background refresh is stale rather than blocking', () => assert.equal(state({ error: { message: 'רענון נכשל' } }).kind, INQUIRY_RUNTIME_STATE.STALE));
test('RTI-STATE-019 stale state never identifies itself as empty', () => assert.notEqual(state({ error: { message: 'רענון נכשל' }, itemCount: 0 }).kind, INQUIRY_RUNTIME_STATE.EMPTY));
test('RTI-STATE-020 Room action navigates to organizational selection', () => assert.equal(state({ roomId: '' }).action, 'select_room'));
test('RTI-STATE-021 auth action retries authentication initialization', () => assert.equal(state({ authStatus: 'unavailable' }).action, 'retry_auth'));
test('RTI-STATE-022 API action retries the current Board', () => assert.equal(state({ loaded: false, error: { message: 'נכשל' } }).action, 'retry_board'));
test('RTI-STATE-023 API request ID is preserved for support', () => assert.equal(state({ loaded: false, error: { message: 'נכשל', requestId: 'req-7' } }).requestId, 'req-7'));
test('RTI-STATE-024 My Tasks requires authenticated server access', () => assert.equal(state({ taskView: true, authStatus: 'unavailable', itemCount: 1 }).kind, INQUIRY_RUNTIME_STATE.AUTH_ERROR));
test('RTI-STATE-025 empty My Tasks uses the real successful empty state', () => assert.equal(state({ taskView: true, itemCount: 0 }).kind, INQUIRY_RUNTIME_STATE.EMPTY));
test('RTI-STATE-026 normalized Board error retains authorization metadata', () => {
    const error = toBoardRuntimeError({ message: 'אסור', status: 403, code: 'BOARD_ACCESS_FORBIDDEN', requestId: 'req-403', authorization: true });
    assert.deepEqual(error, { message: 'אסור', status: 403, code: 'BOARD_ACCESS_FORBIDDEN', requestId: 'req-403', authorization: true, retryable: false });
});

test('RTI-ORG-001 authenticated hierarchy uses only canonical authorized active nodes', async () => {
    const calls = [];
    const responses = new Map([
        ['/api/auth/me', { status: 'AUTHORIZED', effectiveAccess: { global: false, systemIds: [objectId(1)], environmentIds: [objectId(2)], subEnvironmentIds: [objectId(3)], roomIds: [objectId(4)] }, memberships: [] }],
        ['/api/access-request-options', { systems: [{ id: objectId(1), name: 'מערכת מותרת' }, { id: objectId(9), name: 'מערכת אסורה' }] }],
        [`/api/access-request-options?systemId=${objectId(1)}`, { environments: [{ id: objectId(2), name: 'סביבה' }] }],
        [`/api/access-request-options?systemId=${objectId(1)}&environmentId=${objectId(2)}`, { subEnvironments: [{ id: objectId(3), name: 'תת סביבה' }] }],
        [`/api/access-request-options?systemId=${objectId(1)}&environmentId=${objectId(2)}&subEnvironmentId=${objectId(3)}`, { rooms: [{ id: objectId(4), name: 'חדר אמת' }, { id: objectId(8), name: 'חדר אסור' }] }]
    ]);
    const request = async (path) => {
        calls.push(path);
        assert.ok(responses.has(path), path);
        return { data: responses.get(path) };
    };
    const result = await createRuntimeOrganizationApi(request)();
    assert.deepEqual(result.hierarchy.rooms.map((room) => room.id), [objectId(4)]);
    assert.equal(result.hierarchy.rooms[0].environmentId, objectId(2));
    assert.equal(result.hierarchy.rooms[0].subEnvironmentId, objectId(3));
    assert.equal(result.hierarchy.rooms[0].backendId, objectId(4));
    assert.equal(calls.length, 5);
});

test('RTI-ORG-002 global access includes all active descendant Rooms', async () => {
    const request = async (path) => {
        if (path === '/api/auth/me') return { data: { status: 'AUTHORIZED', effectiveAccess: { global: true, systemIds: [objectId(1)], environmentIds: [], subEnvironmentIds: [], roomIds: [] } } };
        if (path === '/api/access-request-options') return { data: { systems: [{ id: objectId(1), name: 'מערכת' }] } };
        if (path.includes('subEnvironmentId=')) return { data: { rooms: [{ id: objectId(4), name: 'חדר' }] } };
        if (path.includes('environmentId=')) return { data: { subEnvironments: [{ id: objectId(3), name: 'תת סביבה' }] } };
        return { data: { environments: [{ id: objectId(2), name: 'סביבה' }] } };
    };
    const result = await createRuntimeOrganizationApi(request)();
    assert.equal(result.hierarchy.rooms.length, 1);
});

test('RTI-ORG-003 unauthorised identity never loads hierarchy options', async () => {
    let calls = 0;
    const result = await createRuntimeOrganizationApi(async (path) => {
        calls += 1;
        assert.equal(path, '/api/auth/me');
        return { data: { status: 'ACCESS_REQUIRED' } };
    })();
    assert.equal(calls, 1);
    assert.deepEqual(result.hierarchy.rooms, []);
});

test('RTI-ARCH-001 production hierarchy no longer imports Room mocks or creates temporary IDs', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/features/rooms/hooks/useRoomHierarchy.js'), 'utf8');
    assert.doesNotMatch(source, /roomHierarchy\.mock|Date\.now|Math\.random/);
    assert.match(source, /organizationHierarchy/);
});

test('RTI-ARCH-002 Ticket list uses one mutually exclusive runtime state branch', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/pages/TicketListPage/TicketListPage.jsx'), 'utf8');
    assert.match(source, /organization\.viewState\.blocking/);
    assert.doesNotMatch(source, /organization\.error\s*&&/);
    assert.match(source, /INQUIRY_RUNTIME_STATE\.FILTERED_EMPTY|RuntimeStatePanel/);
});

test('RTI-ARCH-003 no production Room environment fallback or fake token was introduced', async () => {
    const files = [
        'src/store/session.store.js',
        'src/features/rooms/services/runtimeOrganizationApi.js',
        'src/features/tickets/hooks/useInquiryOrganization.js',
        'src/features/tickets/boards/api/authenticatedHttpClient.js'
    ];
    const source = (await Promise.all(files.map((file) => readFile(resolve(process.cwd(), file), 'utf8')))).join('\n');
    assert.doesNotMatch(source, /VITE_TAMAR_ROOM_ID|configuredRoomId/);
    assert.doesNotMatch(source, /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/);
    assert.doesNotMatch(source, /personalNumber\s*:/);
});
