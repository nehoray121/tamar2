import { ticketBoardsApi } from '../boards/api/ticketBoardsApi.js';
import { adaptBoardItem } from '../boards/domain/boardItemAdapter.js';

const PAGE_SIZE = 100;
const CONCURRENCY = 5;

const runBounded = async (values, worker, concurrency = CONCURRENCY) => {
    const queue = [...values];
    const results = [];

    const run = async () => {
        while (queue.length) {
            const value = queue.shift();

            try {
                results.push({
                    value,
                    ok: true,
                    result: await worker(value)
                });
            } catch (error) {
                results.push({
                    value,
                    ok: false,
                    error
                });
            }
        }
    };

    await Promise.all(
        Array.from(
            { length: Math.min(concurrency, values.length) },
            run
        )
    );

    return results;
};

const withoutPagination = (query = {}) => {
    const next = { ...query };
    delete next.page;
    delete next.limit;
    return next;
};

export const loadAllMatchingBoardRows = async ({
    roomId,
    boardType,
    query,
    signal,
    onProgress
}) => {
    const baseQuery = withoutPagination(query);
    const rows = [];
    const seen = new Set();

    let page = 1;
    let totalPages = 1;
    let totalItems = 0;

    while (page <= totalPages) {
        const response = await ticketBoardsApi.getBoardItems({
            roomId,
            boardType,
            query: {
                ...baseQuery,
                page,
                limit: PAGE_SIZE
            },
            signal
        });

        const items = (response.data?.items || [])
            .map(adaptBoardItem);

        for (const row of items) {
            if (seen.has(row.boardItemId)) continue;
            seen.add(row.boardItemId);
            rows.push(row);
        }

        const pagination = response.data?.pagination || {};
        totalPages = Math.max(
            1,
            Number(pagination.totalPages) || 1
        );
        totalItems = Math.max(
            rows.length,
            Number(pagination.totalItems) || 0
        );

        onProgress?.({
            phase: 'loading',
            completed: rows.length,
            total: totalItems
        });

        if (!items.length) break;
        page += 1;
    }

    return rows;
};

export const updateSelectedBoardRows = async ({
    roomId,
    boardType,
    rows,
    inputForRow,
    onProgress
}) => {
    const selectedRows = Array.isArray(rows) ? rows : [];

    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    onProgress?.({
        total: selectedRows.length,
        completed: 0,
        succeeded: 0,
        failed: 0,
        conflicts: 0
    });

    const results = await runBounded(
        selectedRows,
        async (row) => {
            try {
                const response = await ticketBoardsApi.updateBoardItemState({
                    roomId,
                    boardType,
                    itemId: row.boardItemId,
                    input: inputForRow(row),
                    ifMatch: row.boardStateEtag
                        || String(row.boardStateVersion)
                });

                succeeded += 1;
                return response.data;
            } catch (error) {
                failed += 1;

                if (
                    error?.conflict
                    || String(error?.code || '').includes('CONFLICT')
                    || error?.status === 409
                ) {
                    conflicts += 1;
                }

                throw error;
            } finally {
                completed += 1;

                onProgress?.({
                    total: selectedRows.length,
                    completed,
                    succeeded,
                    failed,
                    conflicts
                });
            }
        }
    );

    return {
        results,
        failedIds: results
            .filter((result) => !result.ok)
            .map((result) => result.value.boardItemId),
        succeeded,
        failed,
        conflicts
    };
};
