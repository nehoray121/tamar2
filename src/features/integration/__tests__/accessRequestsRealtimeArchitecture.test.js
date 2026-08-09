import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Access Requests reuse the shared authenticated Socket singleton', async () => {
    const [pageSource, socketSource] = await Promise.all([
        readFile(resolve(process.cwd(), 'src/pages/AccessRequestsPage/AccessRequestsPage.jsx'), 'utf8'),
        readFile(resolve(process.cwd(), 'src/features/tickets/boards/realtime/boardSocket.js'), 'utf8')
    ]);

    assert.match(pageSource, /subscribeAccessRequestRealtime/);
    assert.doesNotMatch(pageSource, /from ['"]socket\.io-client['"]/);
    assert.match(socketSource, /ACCESS_REQUEST_EVENTS/);
    assert.match(socketSource, /permissions:updated/);
    assert.match(socketSource, /setTimeout\(\(\) => \{/);
});
