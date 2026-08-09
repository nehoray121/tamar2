import { useEffect, useMemo, useRef, useState } from 'react';
import { ticketBoardsApi } from '../api/ticketBoardsApi.js';
import { BoardApiError } from '../api/boardApiErrors.js';
import { adaptBoardItem, adaptCategory, replaceBoardItemState } from '../domain/boardItemAdapter.js';
import { subscribeBoardRealtime } from '../realtime/boardSocket.js';

const emptyPagination = { page: 1, limit: 25, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
const conflictCodes = new Set(['BOARD_STATE_VERSION_CONFLICT', 'BOARD_CATEGORY_VERSION_CONFLICT', 'PRECONDITION_REQUIRED']);
export const stateReflectsInput = (state, input) => Object.entries(input).every(([key, value]) => {
    if (key === 'categoryId') return String(state?.category?.id || '') === String(value || '');
    if (key === 'isPinned') return Boolean(state?.isPinned) === Boolean(value);
    return true;
});

export const runBounded = async (values, worker, concurrency = 4) => {
    const queue = [...values];
    const results = [];
    const run = async () => {
        while (queue.length) {
            const value = queue.shift();
            try { results.push({ value, ok: true, result: await worker(value) }); }
            catch (error) { results.push({ value, ok: false, error }); }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, run));
    return results;
};

export const toBoardRuntimeError = (error, fallback = 'לא ניתן לטעון את לוח הפניות.') => ({
    message: error?.message || fallback,
    code: error?.code || 'BOARD_REQUEST_FAILED',
    status: Number(error?.status) || 0,
    requestId: error?.requestId || null,
    authorization: Boolean(error?.authorization),
    retryable: Boolean(error?.retryable)
});

export const useTicketBoard = ({ roomId, boardType, query, enabled }) => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState(emptyPagination);
    const [capabilities, setCapabilities] = useState({ canChangeCategory: false, canChangePin: false });
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [conflict, setConflict] = useState(null);
    const [pendingIds, setPendingIds] = useState([]);
    const [pendingCategoryIds, setPendingCategoryIds] = useState([]);
    const [bulkProgress, setBulkProgress] = useState(null);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const itemRequestRef = useRef(null);
    const categoryRequestRef = useRef(null);
    const requestSequenceRef = useRef(0);
    const activeLoadRef = useRef(null);
    const itemsRef = useRef(items);
    const categoriesRef = useRef(categories);
    const loadedRef = useRef(loaded);
    const refreshRef = useRef(null);
    const retryRef = useRef(null);
    const queryKey = useMemo(() => JSON.stringify(query || {}), [query]);

    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { categoriesRef.current = categories; }, [categories]);
    useEffect(() => { loadedRef.current = loaded; }, [loaded]);

    const loadCategories = async ({ includeArchived = false, signal, commit = true } = {}) => {
        const response = await ticketBoardsApi.getBoardCategories({
            roomId,
            boardType,
            query: { page: 1, limit: 100, includeArchived, sortBy: 'name', sortDirection: 'asc' },
            signal
        });
        const next = (response.data?.items || []).map((category) => adaptCategory(category));
        if (commit) setCategories(next);
        return next;
    };

    const loadBoard = ({ background = false } = {}) => {
        if (!enabled) return Promise.resolve();
        const requestKey = `${roomId}:${boardType}:${queryKey}`;
        if (activeLoadRef.current?.key === requestKey) return activeLoadRef.current.promise;

        const sequence = ++requestSequenceRef.current;
        itemRequestRef.current?.abort();
        categoryRequestRef.current?.abort();
        const itemController = new AbortController();
        const categoryController = new AbortController();
        itemRequestRef.current = itemController;
        categoryRequestRef.current = categoryController;
        const retainData = background && loadedRef.current;
        if (retainData) {
            setRefreshing(true);
        } else {
            loadedRef.current = false;
            setLoaded(false);
            setLoading(true);
            setItems([]);
            setPagination(emptyPagination);
        }
        setError(null);

        const promise = (async () => {
            try {
                const [itemResponse, nextCategories] = await Promise.all([
                    ticketBoardsApi.getBoardItems({ roomId, boardType, query, signal: itemController.signal }),
                    loadCategories({ signal: categoryController.signal, commit: false })
                ]);
                if (sequence !== requestSequenceRef.current) return;
                const nextItems = (itemResponse.data?.items || []).map(adaptBoardItem);
                setItems(nextItems);
                setCategories(nextCategories);
                setPagination(itemResponse.data?.pagination || emptyPagination);
                setCapabilities(itemResponse.data?.capabilities || { canChangeCategory: false, canChangePin: false });
                categoriesRef.current = nextCategories;
                loadedRef.current = true;
                setLoaded(true);
                setError(null);
            } catch (nextError) {
                if (nextError?.name === 'AbortError' || sequence !== requestSequenceRef.current) return;
                setError(toBoardRuntimeError(nextError));
            } finally {
                if (sequence === requestSequenceRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
                if (activeLoadRef.current?.promise === promise) activeLoadRef.current = null;
            }
        })();
        activeLoadRef.current = { key: requestKey, promise };
        return promise;
    };
    refreshRef.current = loadBoard;

    useEffect(() => {
        loadedRef.current = false;
        setLoaded(false);
        setItems([]);
        setCategories([]);
        setPagination(emptyPagination);
        setError(null);
        setConflict(null);
        retryRef.current = null;
    }, [roomId, boardType]);

    useEffect(() => {
        if (!enabled) {
            requestSequenceRef.current += 1;
            itemRequestRef.current?.abort();
            categoryRequestRef.current?.abort();
            activeLoadRef.current = null;
            loadedRef.current = false;
            setLoaded(false);
            setLoading(false);
            setRefreshing(false);
            setError(null);
            setItems([]);
            setCategories([]);
            setPagination(emptyPagination);
            return undefined;
        }
        loadBoard();
        return () => {
            requestSequenceRef.current += 1;
            itemRequestRef.current?.abort();
            categoryRequestRef.current?.abort();
            activeLoadRef.current = null;
        };
    }, [roomId, boardType, queryKey, enabled]);

    useEffect(() => {
        if (!enabled) return undefined;
        return subscribeBoardRealtime({
            roomId,
            boardType,
            onInvalidate: () => refreshRef.current?.({ background: true }),
            onConnectionChange: setRealtimeConnected
        });
    }, [roomId, boardType, enabled]);
    const refetchState = async (itemId) => {
        const response = await ticketBoardsApi.getBoardItemState({ roomId, boardType, itemId });
        setItems((current) => current.map((row) => row.boardItemId === itemId
            ? replaceBoardItemState(row, response.data, response.etag)
            : row));
        return response;
    };

    const updateItemState = async (itemId, input, { refreshAfter = true, recoverConflict = true } = {}) => {
        const row = itemsRef.current.find((item) => item.boardItemId === itemId);
        if (!row) throw new BoardApiError({ code: 'BOARD_ITEM_NOT_FOUND', message: 'הפנייה אינה זמינה עוד בלוח זה.' });
        setPendingIds((current) => [...new Set([...current, itemId])]);
        setError(null);
        try {
            const response = await ticketBoardsApi.updateBoardItemState({
                roomId,
                boardType,
                itemId,
                input,
                ifMatch: row.boardStateEtag || String(row.boardStateVersion)
            });
            setItems((current) => current.map((item) => item.boardItemId === itemId
                ? replaceBoardItemState(item, response.data, response.etag)
                : item));
            setConflict(null);
            retryRef.current = null;
            if (refreshAfter) await loadBoard({ background: true });
            return response.data;
        } catch (nextError) {
            if (conflictCodes.has(nextError?.code) && recoverConflict) {
                let latest = null;
                try { latest = await refetchState(itemId); } catch {}
                await loadBoard({ background: true });
                if (latest && stateReflectsInput(latest.data, input)) {
                    setConflict(null);
                    retryRef.current = null;
                    setError(null);
                    return latest.data;
                }
                setConflict({ itemId, input });
                retryRef.current = () => updateItemState(itemId, input);
            } else if (recoverConflict && ['BOARD_ITEM_NOT_ELIGIBLE', 'BOARD_CATEGORY_ARCHIVED'].includes(nextError?.code)) {
                await loadBoard({ background: true });
            }
            setError(toBoardRuntimeError(nextError, 'לא ניתן לעדכן את הפנייה.'));
            throw nextError;
        } finally {
            setPendingIds((current) => current.filter((id) => id !== itemId));
        }
    };

    const withCategoryPending = async (categoryId, operation) => {
        const pendingKey = categoryId || 'new';
        setPendingCategoryIds((current) => [...new Set([...current, pendingKey])]);
        try { return await operation(); }
        finally { setPendingCategoryIds((current) => current.filter((id) => id !== pendingKey)); }
    };

    const createCategory = (input) => withCategoryPending(null, async () => {
        const response = await ticketBoardsApi.createBoardCategory({ roomId, boardType, input });
        await loadCategories();
        return adaptCategory(response.data, response.etag);
    });

    const updateCategory = (categoryId, input) => withCategoryPending(categoryId, async () => {
        const category = categoriesRef.current.find((item) => item.id === categoryId);
        if (!category || category.archived) throw new BoardApiError({ code: 'BOARD_CATEGORY_NOT_FOUND', message: 'הקטגוריה אינה זמינה לעריכה.' });
        try {
            const response = await ticketBoardsApi.updateBoardCategory({
                roomId, boardType, categoryId, input, ifMatch: category.categoryEtag || String(category.categoryVersion)
            });
            await Promise.all([loadCategories(), loadBoard({ background: true })]);
            return adaptCategory(response.data, response.etag);
        } catch (nextError) {
            if (conflictCodes.has(nextError?.code)) await loadCategories();
            throw nextError;
        }
    });

    const archiveCategory = (categoryId) => withCategoryPending(categoryId, async () => {
        const category = categoriesRef.current.find((item) => item.id === categoryId);
        if (!category || category.archived) throw new BoardApiError({ code: 'BOARD_CATEGORY_NOT_FOUND', message: 'הקטגוריה אינה זמינה לארכוב.' });
        try {
            await ticketBoardsApi.archiveBoardCategory({
                roomId, boardType, categoryId, ifMatch: category.categoryEtag || String(category.categoryVersion)
            });
            await Promise.all([loadCategories(), loadBoard({ background: true })]);
        } catch (nextError) {
            if (conflictCodes.has(nextError?.code)) await loadCategories();
            throw nextError;
        }
    });

    const updateMany = async (itemIds, inputForItem) => {
        setBulkProgress({ total: itemIds.length, completed: 0, succeeded: 0, failed: 0, conflicts: 0 });
        const results = await runBounded(itemIds, async (itemId) => {
            try {
                const result = await updateItemState(itemId, inputForItem(itemId), { refreshAfter: false, recoverConflict: false });
                setBulkProgress((current) => ({ ...current, completed: current.completed + 1, succeeded: current.succeeded + 1 }));
                return result;
            } catch (nextError) {
                setBulkProgress((current) => ({
                    ...current,
                    completed: current.completed + 1,
                    failed: current.failed + 1,
                    conflicts: current.conflicts + (nextError?.conflict ? 1 : 0)
                }));
                throw nextError;
            }
        }, 4);
        const failures = results.filter((result) => !result.ok);
        const conflicts = failures.filter((result) => result.error?.conflict).length;
        setBulkProgress({
            total: itemIds.length,
            completed: itemIds.length,
            succeeded: itemIds.length - failures.length,
            failed: failures.length,
            conflicts
        });
        await loadBoard({ background: true });
        return { results, failedIds: failures.map((result) => result.value) };
    };

    return {
        items,
        categories,
        pagination,
        capabilities,
        loaded,
        loading,
        refreshing,
        error,
        conflict,
        pendingIds,
        pendingCategoryIds,
        bulkProgress,
        realtimeConnected,
        refresh: () => loadBoard({ background: loadedRef.current }),
        retryConflict: () => retryRef.current?.(),
        createCategory,
        updateCategory,
        archiveCategory,
        assignCategory: (itemId, categoryId) => updateItemState(itemId, { categoryId: categoryId || null }),
        setPinned: (itemId, isPinned) => updateItemState(itemId, { isPinned }),
        assignManyCategory: (itemIds, categoryId) => updateMany(itemIds, () => ({ categoryId: categoryId || null })),
        setManyPinned: (itemIds, isPinned) => updateMany(itemIds, () => ({ isPinned }))
    };
};
