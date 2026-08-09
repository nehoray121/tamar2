import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildHierarchyBreadcrumb } from '../services/hierarchyBreadcrumbModel.js';
import { canCreateRoomFor, canCreateSubEnvironmentFor } from '../services/hierarchyCreationCapabilities.js';
import { createOrganizationHierarchyApi } from '../services/organizationHierarchyApi.js';
import { createRuntimeOrganizationApi } from '../services/runtimeOrganizationApi.js';

const objectId = (digit) => String(digit).repeat(24);
const environment = { id: objectId(2), systemId: objectId(1), name: 'Environment E1' };
const subEnvironment = { id: objectId(3), systemId: objectId(1), environmentId: objectId(2), name: 'SubEnvironment SE1' };
const room = { id: objectId(4), systemId: objectId(1), environmentId: objectId(2), subEnvironmentId: objectId(3), name: 'Room A' };

test('HIERARCHY-BREADCRUMB-001 selected hierarchy uses canonical highest-to-lowest DOM order without an inline root', () => {
    assert.deepEqual(buildHierarchyBreadcrumb({}).map((item) => item.name), ['כל הסביבות']);
    assert.deepEqual(buildHierarchyBreadcrumb({ selectedEnvironment: environment }).map((item) => item.name), ['Environment E1']);
    const fullPath = buildHierarchyBreadcrumb({
        selectedEnvironment: environment,
        selectedSubEnvironment: subEnvironment,
        selectedRoom: room
    });
    assert.deepEqual(fullPath.map((item) => item.name), ['Environment E1', 'SubEnvironment SE1', 'Room A']);
    assert.deepEqual(fullPath.map((item) => item.level), ['environment', 'subEnvironment', 'room']);
});

test('HIERARCHY-BREADCRUMB-002 parent navigation and Environment switching clear stale descendants', () => {
    const switched = { id: objectId(5), systemId: objectId(1), name: 'Environment E2' };
    assert.deepEqual(buildHierarchyBreadcrumb({ selectedEnvironment: environment }).map((item) => item.name), ['Environment E1']);
    assert.deepEqual(buildHierarchyBreadcrumb({ selectedEnvironment: switched }).map((item) => item.name), ['Environment E2']);
    assert.equal(buildHierarchyBreadcrumb({ selectedEnvironment: switched }).some((item) => item.name === 'Environment E1'), false);
    assert.equal(buildHierarchyBreadcrumb({ selectedEnvironment: switched }).some((item) => item.name === 'תת־סביבות'), false);
});

test('HIERARCHY-BREADCRUMB-003 renderer uses one explicit RTL row and automatic entity-name direction', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/pages/HierarchyPage/HierarchyPage.jsx'), 'utf8');
    assert.match(source, /data-breadcrumb-direction="rtl-row"/);
    assert.match(source, /dir="rtl"[\s\S]*className="inquiry-control flex min-w-0 flex-row/);
    assert.match(source, /<span dir="auto" className="truncate">/);
    assert.doesNotMatch(source, /organization-breadcrumb[^>]*flex-row-reverse/);
    assert.doesNotMatch(source, /onMouseEnter={onSelect}/);
    assert.match(source, /segment.level === 'environment'/);
    assert.match(source, /segment.level === 'subEnvironment'/);
});

test('HIERARCHY-CAPABILITY-001 only a Backend-issued exact-System capability exposes creation', () => {
    const capabilities = { canCreateSubEnvironment: true, canCreateRoom: true, systemIds: [objectId(1)] };
    assert.equal(canCreateSubEnvironmentFor({ selectedEnvironment: environment, capabilities }), true);
    assert.equal(canCreateRoomFor({ selectedEnvironment: environment, subEnvironment, capabilities }), true);
    assert.equal(canCreateSubEnvironmentFor({ selectedEnvironment: environment, capabilities: { ...capabilities, systemIds: [objectId(9)] } }), false);
    assert.equal(canCreateRoomFor({ selectedEnvironment: environment, subEnvironment: { ...subEnvironment, environmentId: objectId(9) }, capabilities }), false);
    assert.equal(canCreateSubEnvironmentFor({ selectedEnvironment: environment, capabilities: { role: 'super_admin' } }), false);
});

test('HIERARCHY-API-001 creation uses authenticated canonical parent routes and server payloads', async () => {
    const calls = [];
    const request = async (path, options) => { calls.push({ path, options }); return { data: { id: objectId(8) } }; };
    const api = createOrganizationHierarchyApi(request);
    const signal = new AbortController().signal;
    await api.createSubEnvironment({ environmentId: environment.id, input: { name: 'חדשה' }, signal });
    await api.createRoom({ subEnvironmentId: subEnvironment.id, input: { name: 'חדר חדש' }, signal });
    assert.deepEqual(calls.map((call) => call.path), [
        '/api/environments/' + environment.id + '/sub-environments',
        '/api/sub-environments/' + subEnvironment.id + '/rooms'
    ]);
    assert.ok(calls.every((call) => call.options.method === 'POST' && call.options.signal === signal));
});

test('HIERARCHY-RUNTIME-001 System scope is exact and empty authorized parents remain visible', async () => {
    const calls = [];
    const request = async (path) => {
        calls.push(path);
        if (path === '/api/auth/me') return { data: { status: 'AUTHORIZED', effectiveAccess: { global: true, systemIds: [objectId(1)], environmentIds: [], subEnvironmentIds: [], roomIds: [] } } };
        if (path === '/api/access-request-options') return { data: { systems: [{ id: objectId(1), name: 'מורשית' }, { id: objectId(9), name: 'לא מורשית' }] } };
        if (path === '/api/access-request-options?systemId=' + objectId(1)) return { data: { environments: [{ id: objectId(2), name: 'ריקה' }] } };
        return { data: {} };
    };
    const result = await createRuntimeOrganizationApi(request)();
    assert.deepEqual(result.hierarchy.systems.map((item) => item.id), [objectId(1)]);
    assert.deepEqual(result.hierarchy.environments.map((item) => item.id), [objectId(2)]);
    assert.deepEqual(result.hierarchy.subEnvironments, []);
    assert.equal(calls.some((path) => path.includes(objectId(9))), false);
});

test('HIERARCHY-ARCH-001 no local IDs, mock mutations or frontend role authority were restored', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/features/rooms/hooks/useRoomHierarchy.js'), 'utf8');
    assert.doesNotMatch(source, /Date\.now|Math\.random|roomHierarchy\.mock|user\.role|super_admin/);
    assert.match(source, /AbortController/);
    assert.match(source, /activeSubEnvironmentId\.current !== subEnvironmentId/);
});

test('HIERARCHY-ARCH-002 restored browser context is canonicalized by IDs rather than stored names', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/store/session.store.js'), 'utf8');
    assert.match(source, /environmentId: environment\?\.id/);
    assert.match(source, /roomId: room\?\.id/);
    assert.match(source, /findValidatedSelection/);
    assert.doesNotMatch(source, /environmentName|roomName/);
});
