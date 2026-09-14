import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInquiryRowActivation, ROW_VIEW_CLICK_DELAY_MS } from '../utils/inquiryRowActivation.js';
import { detailDisplayValue, detailFieldIcon } from '../../../pages/TicketListPage/inquiryDetailPresentation.js';
const source = (p) => readFile(new URL('../../../' + p, import.meta.url), 'utf8');

function fixture(extra = {}) {
    const calls = [], timers = new Map(); let id = 0;
    const row = { isConnected: true, contains: (el) => el?.inside === true, ownerDocument: { defaultView: { getSelection: () => null } } };
    const target = { inside: true, closest: () => null };
    const event = (patch = {}) => ({ target, currentTarget: row, detail: 1, button: 0, preventDefault() { this.defaultPrevented = true; }, ...patch });
    const activation = createInquiryRowActivation({ schedule: (fn, delay) => { assert.equal(delay, ROW_VIEW_CLICK_DELAY_MS); timers.set(++id, fn); return id; }, unschedule: (n) => timers.delete(n) });
    const options = { ticket: { boardItemId: 'b1', ticketId: 'canonical1' }, onView: (t) => calls.push(['view', t]), onToggleSelection: () => calls.push(['toggle']), onEnterSelectionMode: (id) => calls.push(['selection', id]), onDragStart: () => calls.push(['drag']), ...extra };
    activation.configure(options);
    const flush = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((fn) => fn()); };
    return { activation, calls, row, target, event, flush, options, timers };
}

test('single click opens exactly the current canonical ticket once', () => {
    const f = fixture(); f.activation.onClick(f.event()); assert.equal(f.calls.length, 0); f.flush();
    assert.deepEqual(f.calls, [['view', f.options.ticket]]); f.flush(); assert.equal(f.calls.length, 1);
});
for (const label of ['button', 'svg', 'chip', 'checkbox', 'label', 'link', 'drag handle', 'input']) {
    test(`${label} is excluded from row activation`, () => {
        const f = fixture(); f.target.closest = () => ({}); f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 0);
    });
}
test('portal menu events outside the row cannot open details', () => {
    const f = fixture(); f.target.inside = false; f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 0);
});
for (const patch of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }, { defaultPrevented: true }]) {
    test('modified/non-primary/default-prevented click is ignored: ' + JSON.stringify(patch), () => {
        const f = fixture(); f.activation.onClick(f.event(patch)); f.flush(); assert.equal(f.calls.length, 0);
    });
}
test('double click cancels pending viewer and enters existing selection mode', () => {
    const f = fixture(); f.activation.onClick(f.event()); f.activation.onClick(f.event({ detail: 2 })); f.activation.onDoubleClick(f.event({ detail: 2 })); f.flush(); assert.deepEqual(f.calls, [['selection', 'b1']]);
});
test('selection-mode click toggles selection, not details; second click is ignored', () => {
    const f = fixture({ selectionMode: true }); f.activation.onClick(f.event()); f.activation.onClick(f.event({ detail: 2 })); f.activation.onDoubleClick(f.event()); f.flush(); assert.deepEqual(f.calls, [['toggle']]);
});
test('text selection does not open the viewer', () => {
    const f = fixture(); f.row.ownerDocument.defaultView.getSelection = () => ({ isCollapsed: false, anchorNode: f.target, toString: () => 'selected' }); f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 0);
});
test('selection made while click is pending cancels viewer activation', () => {
    const f = fixture(); f.activation.onClick(f.event()); f.row.ownerDocument.defaultView.getSelection = () => ({ isCollapsed: false, focusNode: f.target, toString: () => 'selected' }); f.flush(); assert.equal(f.calls.length, 0);
});
test('drag callback remains connected and dragged row does not open', () => {
    const f = fixture(); f.activation.onClick(f.event()); f.activation.onDragStart(f.event()); f.activation.onClick(f.event()); f.flush(); assert.deepEqual(f.calls, [['drag']]);
});
test('pointer movement/cancellation prevents accidental click; next pointer down resets', () => {
    const f = fixture(); f.activation.onPointerDown(f.event({ clientX: 0, clientY: 0 })); f.activation.onPointerMove(f.event({ clientX: 15, clientY: 0, buttons: 1 })); f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 0);
    f.activation.onPointerDown(f.event({ clientX: 0, clientY: 0 })); f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 1);
    f.activation.onPointerCancel(); f.activation.onClick(f.event()); f.flush(); assert.equal(f.calls.length, 1);
});
for (const key of ['Enter', ' ']) test(`keyboard ${key} opens without a click timer`, () => {
    const f = fixture(); const e = f.event({ target: f.row, key }); f.activation.onKeyDown(e); assert.equal(e.defaultPrevented, true); assert.deepEqual(f.calls, [['view', f.options.ticket]]);
});
test('child button keyboard events and repeated keys are not intercepted', () => {
    const f = fixture(); f.activation.onKeyDown(f.event({ key: 'Enter' })); f.activation.onKeyDown(f.event({ target: f.row, key: 'Enter', repeat: true })); assert.equal(f.calls.length, 0);
});
test('cleanup and disconnected rows cannot open stale modals', () => {
    const f = fixture(); f.activation.onClick(f.event()); f.activation.cancel(); f.flush(); assert.equal(f.calls.length, 0);
    f.activation.onClick(f.event()); f.row.isConnected = false; f.flush(); assert.equal(f.calls.length, 0);
});
test('false and numeric zero are real values, not empty placeholders', () => {
    assert.equal(detailDisplayValue({}, false), 'false'); assert.equal(detailDisplayValue({}, 0), '0');
    for (const v of ['', undefined, null]) assert.equal(detailDisplayValue({}, v), '—');
});
test('arrays, long descriptions, links and dates preserve current values without time-zone shifts', () => {
    assert.equal(detailDisplayValue({}, ['תל אביב', 'חיפה']), 'תל אביב, חיפה');
    assert.equal(detailDisplayValue({ type: 'longtext' }, 'שורה 1\nשורה 2'), 'שורה 1\nשורה 2');
    assert.equal(detailDisplayValue({ type: 'link', linkConfig: { label: 'קישור' } }, ''), 'קישור');
    assert.equal(detailDisplayValue({ type: 'date' }, '2026-09-08'), '08/09/2026');
    assert.equal(detailDisplayValue({}, '<script>x</script>'), '<script>x</script>');
});
test('known and custom fields have a safe presentation icon', () => {
    assert.equal(detailFieldIcon({ id: 'phone' }), 'phone'); assert.equal(detailFieldIcon({ id: 'custom', type: 'date' }), 'calendar'); assert.equal(detailFieldIcon({ id: 'new' }), 'filePlus');
});
test('viewer still uses canonical canvas, current values and existing edit callbacks', async () => {
    const modal = await source('pages/TicketListPage/TicketModal.jsx');
    assert.equal((modal.match(/<InquiryFormCanvas/g) || []).length, 1);
    for (const token of ['fields={layoutFields}', 'sections={layoutSections}', 'values={layoutValues}', 'editableValues={isEditing}', 'readOnlyLayoutFieldIds.has(field.id)', 'updateFieldValue(fieldId, value)', 'ticketsApi.update(', 'serverCapabilities.canReopen', 'ticketsApi.history(', '<TicketChatDrawer']) assert.ok(modal.includes(token), token);
    assert.match(modal, /renderField=\{isEditing \? undefined/); assert.match(modal, /value=\{layoutValues\[field.id\]\}/);
});
test('canonical canvas still owns hidden fields, order and widths', async () => {
    const canvas = await source('features/inquiries/layout/InquiryFormCanvas.jsx');
    for (const token of ['includeHidden || item.visible !== false', 'section.fields || []', 'item.width || item.field.width', 'inquiryWidthToGridClass(width)']) assert.ok(canvas.includes(token), token);
});
test('viewer and confirmations share body-level layers in the correct order', async () => {
    const modal = await source('pages/TicketListPage/TicketModal.jsx');
    const close = await source('features/tickets/components/CloseInquiryDialog.jsx');
    const reopen = await source('features/tickets/components/ReopenInquiryDialog.jsx');
    for (const text of [modal, close, reopen]) { assert.match(text, /return createPortal\(/); assert.match(text, /document.body\s*\)/); }
    assert.match(modal, /z-\[90\]/); assert.match(close, /z-\[100\]/); assert.match(reopen, /z-\[110\]/);
});
test('read-only cards are escaped text, not controls or injected HTML', async () => {
    const cards = await source('pages/TicketListPage/InquiryDetailReadView.jsx');
    assert.doesNotMatch(cards, /dangerouslySetInnerHTML|<input|<select|<textarea/);
    assert.match(cards, /detailDisplayValue\(field, value\)/); assert.match(cards, /section.title/);
});
test('scoped read-view CSS wraps long values and retains one body scroller', async () => {
    const css = await source('pages/TicketListPage/ticketView.v1.css');
    assert.match(css, /overflow-wrap: anywhere/); assert.doesNotMatch(css, /overflow-y:\s*(auto|scroll)/);
    assert.doesNotMatch(css, /!important|z-index:\s*9999|\.dashboard|\.settings/);
});
