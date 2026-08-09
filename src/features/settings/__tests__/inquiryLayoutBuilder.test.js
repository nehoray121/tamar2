import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
    applyInquiryFieldWidth,
    INQUIRY_FORM_CANVAS_CLASS,
    INQUIRY_FORM_CANVAS_WIDTH_PX,
    INQUIRY_FORM_GRID_CLASS,
    INQUIRY_WIDTH_GRID_SPANS,
    inquiryWidthToGridClass,
    inquiryWidthToGridSpan
} from '../../inquiries/layout/inquiryLayout.js';
import { createLatestSettingsSaveQueue } from '../services/settingsSaveQueue.js';

const projectFile = (relativePath) => new URL(`../../../${relativePath}`, import.meta.url);
const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

test('shared inquiry canvas uses the audited 850px popup content width', () => {
    assert.equal(INQUIRY_FORM_CANVAS_WIDTH_PX, 850);
    assert.match(INQUIRY_FORM_CANVAS_CLASS, /max-w-\[850px\]/u);
});

test('canonical widths map to exact 12-column spans', () => {
    assert.deepEqual(INQUIRY_WIDTH_GRID_SPANS, {
        'שליש רוחב': 4,
        'חצי רוחב': 6,
        'רוחב מלא': 12
    });
    assert.equal(inquiryWidthToGridSpan('שליש רוחב'), 4);
    assert.equal(inquiryWidthToGridSpan('חצי רוחב'), 6);
    assert.equal(inquiryWidthToGridSpan('רוחב מלא'), 12);
    assert.equal(inquiryWidthToGridClass('שליש רוחב'), 'sm:col-span-4');
    assert.equal(inquiryWidthToGridClass('חצי רוחב'), 'sm:col-span-6');
    assert.equal(inquiryWidthToGridClass('רוחב מלא'), 'sm:col-span-12');
});

test('mobile stacking and desktop grid are one shared responsive rule', () => {
    assert.equal(INQUIRY_FORM_GRID_CLASS, 'grid grid-cols-1 gap-3 sm:grid-cols-12');
});

test('width updates canonical field and section configuration atomically', () => {
    const original = {
        fields: [{ id: 'priority', width: 'חצי רוחב' }],
        sections: [{ id: 'critical', fields: [{ id: 'priority', width: 'חצי רוחב', visible: true }] }]
    };
    const updated = applyInquiryFieldWidth(original, 'priority', 'רוחב מלא');

    assert.equal(updated.fields[0].width, 'רוחב מלא');
    assert.equal(updated.sections[0].fields[0].width, 'רוחב מלא');
    assert.equal(original.fields[0].width, 'חצי רוחב');
    assert.notEqual(updated.fields, original.fields);
    assert.notEqual(updated.sections, original.sections);
});

test('unsupported widths safely converge to the existing half-width default', () => {
    const updated = applyInquiryFieldWidth({
        fields: [{ id: 'priority', width: 'רוחב מלא' }],
        sections: [{ id: 'critical', fields: [{ id: 'priority', width: 'רוחב מלא' }] }]
    }, 'priority', '70%');
    assert.equal(updated.fields[0].width, 'חצי רוחב');
    assert.equal(updated.sections[0].fields[0].width, 'חצי רוחב');
});

test('builder and real popup import the same canvas and no permanent preview remains', async () => {
    const [builder, popup, settingsPage] = await Promise.all([
        readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8'),
        readFile(projectFile('pages/TicketListPage/TicketModal.jsx'), 'utf8'),
        readFile(projectFile('pages/SettingsPage/SettingsPage.jsx'), 'utf8')
    ]);

    assert.match(builder, /InquiryFormCanvas/u);
    assert.match(popup, /InquiryFormCanvas/u);
    assert.doesNotMatch(settingsPage, /DetailsPreview|preview-panel/u);
    assert.match(builder, /includeHidden=\{viewMode === 'edit'\}/u);
    assert.match(builder, /renderField=\{viewMode === 'edit'/u);
    assert.match(builder, /<LayoutFieldEditor[\s\S]*?item=\{item\}/u);
});

test('builder and popup do not simulate scale with transform or zoom', async () => {
    const sources = await Promise.all([
        readFile(projectFile('features/inquiries/layout/InquiryFormCanvas.jsx'), 'utf8'),
        readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8'),
        readFile(projectFile('pages/TicketListPage/TicketModal.jsx'), 'utf8')
    ]);
    const combined = sources.join('\n');
    assert.doesNotMatch(combined, /transform\s*:\s*scale|zoom\s*:/iu);
});

test('editing toolbar is above the full-width real field renderer', async () => {
    const builder = await readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8');
    const toolbarIndex = builder.indexOf('min-h-9 items-center');
    const fieldRendererIndex = builder.indexOf('<InquiryFormField', toolbarIndex);
    assert.ok(toolbarIndex >= 0);
    assert.ok(fieldRendererIndex > toolbarIndex);
    assert.match(builder.slice(fieldRendererIndex, fieldRendererIndex + 160), /hideLabel/u);
});

test('latest settings save wins even when the first response is delayed', async () => {
    const first = deferred();
    const second = deferred();
    const calls = [];
    const saved = [];
    const queue = createLatestSettingsSaveQueue({
        initialVersion: 7,
        save: (settings, version) => {
            calls.push({ settings, version });
            return calls.length === 1 ? first.promise : second.promise;
        },
        reload: async () => ({ settings: { width: 'server' }, version: 99 }),
        onSaved: (result) => saved.push(result)
    });

    queue.markRevision(1);
    queue.enqueue({ width: 'חצי רוחב' }, 1);
    await nextTurn();
    queue.markRevision(2);
    queue.enqueue({ width: 'רוחב מלא' }, 2);
    first.resolve({ settings: { width: 'חצי רוחב' }, version: 8 });
    await nextTurn();
    second.resolve({ settings: { width: 'רוחב מלא' }, version: 9 });
    await queue.whenIdle();

    assert.deepEqual(calls.map((call) => call.version), [7, 8]);
    assert.deepEqual(saved, [{ settings: { width: 'רוחב מלא' }, version: 9 }]);
});

test('failed latest save rolls back to server truth and never reports success', async () => {
    const saved = [];
    const rolledBack = [];
    const errors = [];
    const queue = createLatestSettingsSaveQueue({
        initialVersion: 3,
        save: async () => {
            throw new Error('conflict');
        },
        reload: async () => ({ settings: { width: 'שליש רוחב' }, version: 4 }),
        onSaved: (result) => saved.push(result),
        onRollback: (result) => rolledBack.push(result),
        onError: (error) => errors.push(error.message)
    });

    queue.markRevision(1);
    queue.enqueue({ width: 'רוחב מלא' }, 1);
    await queue.whenIdle();

    assert.deepEqual(saved, []);
    assert.deepEqual(rolledBack, [{ settings: { width: 'שליש רוחב' }, version: 4 }]);
    assert.deepEqual(errors, ['conflict']);
});

for (const [label, width, span] of [
    ['שליש', 'שליש רוחב', 4],
    ['חצי', 'חצי רוחב', 6],
    ['מלא', 'רוחב מלא', 12]
]) {
    test(`click contract for ${label} updates the canonical persisted width`, () => {
        const updated = applyInquiryFieldWidth({
            fields: [{ id: 'priority', width: 'חצי רוחב' }],
            sections: [{ id: 'critical', fields: [{ id: 'priority', width: 'חצי רוחב' }] }]
        }, 'priority', width);
        assert.equal(updated.fields[0].width, width);
        assert.equal(updated.sections[0].fields[0].width, width);
        assert.equal(inquiryWidthToGridSpan(updated.fields[0].width), span);
    });
}

test('edit and user views share one canvas instead of separate renderers', async () => {
    const builder = await readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8');
    assert.equal((builder.match(/<InquiryFormCanvas/gu) || []).length, 1);
    assert.match(builder, /viewMode === 'edit'/u);
    assert.match(builder, /includeHidden=\{viewMode === 'edit'\}/u);
});

test('hidden fields are omitted by the shared user-view canvas contract', async () => {
    const [builder, canvas] = await Promise.all([
        readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8'),
        readFile(projectFile('features/inquiries/layout/InquiryFormCanvas.jsx'), 'utf8')
    ]);
    assert.match(builder, /includeHidden=\{viewMode === 'edit'\}/u);
    assert.match(canvas, /includeHidden \|\| item\.visible !== false/u);
});

test('field ordering and section association are persisted through canonical sections', async () => {
    const builder = await readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8');
    assert.match(builder, /moveField = \(source, targetSectionId, targetIndex\)/u);
    assert.match(builder, /fieldsInSection\.splice\(index, 0, moved\)/u);
    assert.match(builder, /return \{ \.\.\.current, sections: normalizeSections\(next, currentFields\) \}/u);
});

test('selected width button state is derived from canonical configuration', async () => {
    const builder = await readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8');
    assert.match(builder, /aria-pressed=\{width === option\}/u);
    assert.match(builder, /applyInquiryFieldWidth\(current, fieldId/u);
});

test('RTL uses one explicit direction without row-reverse double reversal', async () => {
    const [canvas, builder] = await Promise.all([
        readFile(projectFile('features/inquiries/layout/InquiryFormCanvas.jsx'), 'utf8'),
        readFile(projectFile('features/settings/components/InquiryLayoutBuilder.jsx'), 'utf8')
    ]);
    assert.match(canvas, /dir="rtl"/u);
    assert.doesNotMatch(`${canvas}\n${builder}`, /flex-row-reverse/u);
});

test('mobile stacking does not rewrite the stored desktop width', () => {
    const settings = {
        fields: [{ id: 'priority', width: 'שליש רוחב' }],
        sections: [{ id: 'critical', fields: [{ id: 'priority', width: 'שליש רוחב' }] }]
    };
    assert.match(INQUIRY_FORM_GRID_CLASS, /grid-cols-1/u);
    assert.equal(settings.fields[0].width, 'שליש רוחב');
    assert.equal(inquiryWidthToGridSpan(settings.fields[0].width), 4);
});

test('settings hook persists through the real repository with revision-aware queueing', async () => {
    const hook = await readFile(projectFile('features/settings/hooks/useRoomSettings.js'), 'utf8');
    assert.match(hook, /settingsRepository\.save\(roomId, nextSettings, version\)/u);
    assert.match(hook, /queueRef\.current\?\.markRevision/u);
    assert.match(hook, /queueRef\.current\?\.enqueue\(snapshot, revision\)/u);
});
