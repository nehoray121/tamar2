// Tamar Wave 4AQ - Settings Content Vertical Fill regression test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '../../../pages/SettingsPage/SettingsPage.jsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../styles/settingsFieldEditor.v4ao.css'), 'utf8');

const beginMarker = '/* BEGIN TAMAR WAVE 4AQ - SETTINGS CONTENT VERTICAL FILL */';
const endMarker = '/* END TAMAR WAVE 4AQ - SETTINGS CONTENT VERTICAL FILL */';
const begin = css.indexOf(beginMarker);
const end = css.indexOf(endMarker);
const wave = begin >= 0 && end > begin ? css.slice(begin, end + endMarker.length) : '';

const ruleFrom = (source, selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'));
    assert.ok(match, `Expected CSS rule: ${selector}`);
    return match[1];
};

test('4AQ fills the compact field-editor body vertically', () => {
    assert.ok(begin >= 0 && end > begin, 'Wave 4AQ marker block must be installed exactly once.');
    assert.equal(css.indexOf(beginMarker, begin + beginMarker.length), -1, 'Wave 4AQ block must not be duplicated.');

    const bodyRule = ruleFrom(wave, '.tamar-settings-choice-editor-v4ap > .tamar-settings-field-editor-body-v4ao');
    assert.match(bodyRule, /display:\s*flex/);
    assert.match(bodyRule, /flex-direction:\s*column/);

    const surfaceRule = ruleFrom(wave, '.tamar-settings-choice-editor-v4ap .tamar-settings-choice-surface-v4ap');
    assert.match(surfaceRule, /display:\s*flex/);
    assert.match(surfaceRule, /flex:\s*1\s+0\s+auto/);
    assert.match(surfaceRule, /flex-direction:\s*column/);
});

test('4AQ spends the remaining height in the dependency area instead of dead space', () => {
    const wrapperRule = ruleFrom(wave, '.tamar-settings-choice-editor-v4ap .tamar-settings-choice-surface-v4ap > .border-t:last-child');
    assert.match(wrapperRule, /display:\s*flex/);
    assert.match(wrapperRule, /flex:\s*1\s+0\s+auto/);
    assert.match(wrapperRule, /flex-direction:\s*column/);

    const editorRule = ruleFrom(wave, '.tamar-settings-choice-editor-v4ap .tamar-dependency-editor-v4ap');
    assert.match(editorRule, /display:\s*flex/);
    assert.match(editorRule, /flex-direction:\s*column/);

    const mapRule = ruleFrom(wave, '.tamar-settings-choice-editor-v4ap .tamar-dependency-map-v4ap');
    assert.match(mapRule, /flex:\s*1\s+0\s+120px/);
});

test('4AQ keeps one fallback scroll owner and preserves the delete footer outside it', () => {
    assert.doesNotMatch(wave, /overflow(?:-x|-y)?\s*:/, 'Wave 4AQ must not create a nested scroll owner.');
    assert.match(css, /\.tamar-settings-choice-editor-v4ap\s*>\s*\.tamar-settings-field-editor-body-v4ao\s*\{[^}]*overflow-y:\s*auto/s);
    assert.doesNotMatch(css, /\.tamar-dependency-(?:map|parents|values|chips)-v4ap\s*\{[^}]*overflow-y:\s*(?:auto|scroll)/s);
    assert.ok(page.includes('}</div><div className="tamar-settings-field-editor-footer-v4ao'));
    assert.match(page, /tamar-settings-field-editor-footer-v4ao.{0,1200}<ToolbarButton.{0,800}tone="danger".{0,800}onDelete\(field\).{0,400}>\s*מחיקת שדה\s*<\/ToolbarButton>/s);
    assert.match(css, /\.tamar-settings-field-editor-footer-v4ao\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
});

test('4AQ is layout-only and remains settings-scoped', () => {
    assert.doesNotMatch(wave, /\.dashboard|\.tamar-claude|\.tamar-v22-sidebar|\bzoom\s*:|scale\(/);
    assert.doesNotMatch(wave, /position:\s*(?:fixed|absolute)|height:\s*\d+px/);
    assert.ok(page.includes("usesCompactSelectEditor && 'tamar-settings-choice-editor-v4ap'"));
    assert.ok(page.includes('aria-label="שדה משפיע"'));
    assert.ok(page.includes('aria-label="בחירת אפשרויות שיוצגו"'));
});
