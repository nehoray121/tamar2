const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const page = fs.readFileSync(path.join(__dirname, '../../../pages/SettingsPage/SettingsPage.jsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../styles/settingsFieldEditor.v4ao.css'), 'utf8');
const clone = x => JSON.parse(JSON.stringify(x));

// Execute the unchanged state-update callbacks directly, without requiring React
// or replacing network/authentication code. JSX rendering is tested separately.
function callbacks(field, fields) {
    const begin = page.indexOf('const DependencyEditor =');
    const end = page.indexOf('    if (compact) {', begin);
    assert.ok(begin >= 0 && end > begin);
    let source = page.slice(begin, end);
    const lines = source.split('\n');
    const guard = lines.findIndex(line => line.includes('if (!selectorTypes.has(field.type)) return <div'));
    assert.ok(guard >= 0, 'Non-select view guard must remain present.');
    lines[guard] = 'if (!selectorTypes.has(field.type)) return null;';
    source = lines.join('\n') + '\nreturn { setParent, toggleMapping, addPendingOption, selectedValues, availableValues };\n};\nDependencyEditor;';
    const helperStart = page.indexOf('const createsCycle =');
    const helperEnd = page.indexOf('const createRuntimeId', helperStart);
    assert.ok(helperEnd > helperStart);
    const factory = vm.runInNewContext(page.slice(helperStart, helperEnd) + source, {
        selectorTypes: new Set(['select', 'multiselect']),
        isValidParent: f => ['select', 'multiselect'].includes(f.type) && f.active !== false && f.visible !== false,
        useState: initial => [initial, () => {}],
        useEffect: () => {}
    });
    const changes = [];
    return { actions: factory({ field, fields, onChange: f => changes.push(clone(f)), compact: true }), changes };
}
const parent = { id: 'city', name: 'City', type: 'select', options: ['A', 'B'] };
const child = { id: 'district', name: 'District', type: 'select', parentId: 'city', options: ['a', 'b', 'c'], dependencyMap: { A: ['a'], B: ['b'] }, required: true, locked: false };

test('adding a mapping preserves other parents and field attributes', () => {
    const { actions, changes } = callbacks(child, [parent, child]);
    actions.toggleMapping('A', 'c');
    assert.deepEqual(changes[0], { ...child, dependencyMap: { A: ['a', 'c'], B: ['b'] } });
    assert.deepEqual(child.dependencyMap.A, ['a']);
});
test('removing a mapping keeps source field options', () => {
    const { actions, changes } = callbacks(child, [parent, child]);
    actions.toggleMapping('A', 'a');
    assert.deepEqual(changes[0].dependencyMap, { A: [], B: ['b'] });
    assert.deepEqual(changes[0].options, ['a', 'b', 'c']);
});
test('changing or clearing the parent resets only dependency mappings', () => {
    const { actions, changes } = callbacks(child, [parent, child]);
    actions.setParent('other'); actions.setParent('');
    assert.deepEqual(changes[0], { ...child, parentId: 'other', dependencyMap: {} });
    assert.equal(changes[1].parentId, undefined);
    assert.deepEqual(changes[1].dependencyMap, {});
    assert.deepEqual(changes[1].options, child.options);
});
test('cyclic dependencies still cannot be selected', () => {
    const linkedParent = { ...parent, parentId: 'district' };
    const { actions, changes } = callbacks(child, [linkedParent, child]);
    actions.setParent('city');
    assert.equal(changes.length, 0);
});
test('empty additions and missing active parent do not mutate mappings', () => {
    const { actions, changes } = callbacks(child, [parent, child]);
    actions.addPendingOption(''); actions.toggleMapping('', 'a');
    assert.equal(changes.length, 0);
    actions.addPendingOption('c');
    assert.deepEqual(changes[0].dependencyMap.A, ['a', 'c']);
});
test('dependent choices use intrinsic height and render all mappings', () => {
    const begin = page.indexOf('const DependencyEditor =');
    const compact = page.slice(page.indexOf('    if (compact) {', begin), page.indexOf('const LinkSettings', begin));
    assert.match(compact, /parentOptions\.map/);
    assert.match(compact, /selectedValues\.map/);
    assert.match(compact, /availableValues\.map/);
    assert.ok(!compact.includes('tamar-settings-dependency-viewport-v4ao'));
    const view = compact.slice(0, compact.indexOf('    return (\n        <div className="space-y-1.5">'));
    assert.doesNotMatch(view, /overflow-y-auto|\.slice\(/);
    assert.match(css, /\.tamar-dependency-map-v4ap\s*\{[^}]*height:\s*auto/s);
    assert.doesNotMatch(css, /(?:min-|max-)?height:\s*(116|132)px/);
});
test('compact presentation is conditional and the footer stays outside the body', () => {
    assert.ok(page.includes("usesCompactSelectEditor && 'tamar-settings-choice-editor-v4ap'"));
    assert.ok(page.includes('}</div><div className="tamar-settings-field-editor-footer-v4ao'));
    assert.ok(page.includes('disabled={field.locked}'));
    assert.ok(page.includes('autosave: true'));
    assert.match(css, /\.tamar-settings-field-editor-footer-v4ao\s*\{[^}]*flex:\s*0 0 auto/s);
    assert.match(css, /\.tamar-settings-field-editor-body-v4ao\s*\{[^}]*overflow-y:\s*auto/s);
});
test('stylesheet does not affect dashboard, authentication, sidebar or scale the page', () => {
    assert.doesNotMatch(css, /\.dashboard|\.tamar-claude|\.tamar-v22-sidebar|\bzoom\s*:|scale\(/);
    assert.ok(page.includes('aria-label="בחירת אפשרויות שיוצגו"'));
    assert.ok(page.includes('aria-label="שדה משפיע"'));
    assert.ok(page.includes('aria-pressed={activeParentOption === parentOption}'));
});
