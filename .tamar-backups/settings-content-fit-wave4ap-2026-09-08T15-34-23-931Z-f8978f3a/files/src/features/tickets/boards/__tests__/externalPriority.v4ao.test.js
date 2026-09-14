import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serializeBoardQuery } from '../api/boardQuerySerializer.js';
import { BOARD_TYPES } from '../domain/boardTypes.js';
const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
for (const board of Object.values(BOARD_TYPES)) {
    test(`${board}: serializes HIGH, MEDIUM and LOW without changing page, search or sort`, () => {
        for (const priority of ['HIGH', 'MEDIUM', 'LOW']) {
            const params = new URLSearchParams(serializeBoardQuery(board, { priority, page: 2, limit: 7, search: 'פנייה', categoryId: 'category', sortBy: 'ticketNumber', sortDirection: 'asc' }));
            assert.equal(params.get('priority'), priority); assert.equal(params.get('page'), '2');
            assert.equal(params.get('limit'), '7'); assert.equal(params.get('search'), 'פנייה');
            assert.equal(params.get('categoryId'), 'category'); assert.equal(params.get('sortDirection'), 'asc');
        }
    });
    test(`${board}: clearing the priority does not serialize an empty value`, () => {
        for (const priority of [undefined, null, '']) {
            assert.equal(new URLSearchParams(serializeBoardQuery(board, { priority, search: 'x' })).has('priority'), false);
        }
    });
}
test('both external boards still drop unsupported ticket dates and caller identity', () => {
    for (const board of [BOARD_TYPES.EXTERNAL_SENT, BOARD_TYPES.EXTERNAL_RECEIVED]) {
        const params = new URLSearchParams(serializeBoardQuery(board, { priority: 'HIGH', createdFrom: '2026-01-01', userId: 'x', initiatedFrom: '2026-01-01', externalState: 'PENDING' }));
        assert.equal(params.has('createdFrom'), false); assert.equal(params.has('userId'), false);
        assert.equal(params.get('initiatedFrom'), '2026-01-01'); assert.equal(params.get('externalState'), 'PENDING');
    }
});
test('external priority control is not hidden, and existing page-reset effect is retained', async () => {
    const page = await read('../../../../pages/TicketListPage/TicketListPage.jsx');
    assert.ok(page.includes('data-testid="inquiry-priority-filter"'));
    assert.ok(!page.includes('{!externalBoard && ('));
    assert.match(page, /priority:\s*priorityValues\[priorityFilter\]/);
    assert.match(page, /setCurrentPage\(1\);\s*\}, \[deferredSearchQuery, pageSize, pinMode, priorityFilter, toggleState, viewType\]\)/);
    assert.ok(page.includes('ReopenInquiryDialog'));
});
test('settings dependency panel is compact and footer is outside the scroll body', async () => {
    const page = await read('../../../../pages/SettingsPage/SettingsPage.jsx');
    const css = await read('../../../settings/styles/settingsFieldEditor.v4ao.css');
    assert.ok(!page.includes('h-[176px] min-h-[176px]'));
    assert.ok(page.includes('tamar-settings-dependency-viewport-v4ao'));
    assert.ok(page.includes('tamar-settings-field-editor-body-v4ao'));
    assert.ok(page.includes('}</div><div className="tamar-settings-field-editor-footer-v4ao'));
    assert.match(css, /height:\s*132px/); assert.match(css, /overflow-y:\s*auto/);
    assert.match(css, /\.tamar-settings-field-editor-footer-v4ao\s*\{[^}]*flex:\s*0 0 auto/s);
    assert.ok(page.includes('disabled={field.locked}')); assert.ok(page.includes('autosave: true'));
});
