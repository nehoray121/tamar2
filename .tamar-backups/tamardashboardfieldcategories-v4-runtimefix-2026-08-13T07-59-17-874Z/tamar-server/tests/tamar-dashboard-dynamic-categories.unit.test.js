const assert = require('node:assert/strict');
const test = require('node:test');
const { parseQuery } = require('../src/routes/analytics.routes.js');
const AnalyticsService = require('../src/services/analytics/AnalyticsService.js');

test('dashboard groupField query accepts safe room-field ids and rejects unsafe paths', () => {
    const parsed = parseQuery({ groupField: 'field-select-1234_abcd', grouping: 'monthly' });
    assert.equal(parsed.groupField, 'field-select-1234_abcd');
    assert.throws(() => parseQuery({ groupField: 'fieldValues.bad', grouping: 'monthly' }));
    assert.throws(() => parseQuery({ groupField: '$where', grouping: 'monthly' }));
});

test('dashboard dynamic category pipeline groups priority at top level and custom fields under fieldValues', () => {
    const summary = { ticketNumber: '$ticketNumber' };
    const priority = AnalyticsService.dashboardCategoryPipeline('priority', summary);
    const custom = AnalyticsService.dashboardCategoryPipeline('field-select-abc', summary);
    assert.equal(priority[0].$set.__dashboardGroupValue, '$priority');
    assert.equal(custom[0].$set.__dashboardGroupValue, '$fieldValues.field-select-abc');
    assert.ok(custom.some((stage) => stage.$unwind));
    assert.ok(custom.some((stage) => stage.$group));
    assert.deepEqual(AnalyticsService.dashboardCategoryPipeline(undefined, summary), [{ $limit: 0 }]);
});
