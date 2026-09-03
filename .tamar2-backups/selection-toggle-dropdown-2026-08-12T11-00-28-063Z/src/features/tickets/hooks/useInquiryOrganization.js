import { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { useTicketBoard } from '../boards/hooks/useTicketBoard.js';
import { BOARD_LABELS, resolveBoardTypeFromView } from '../boards/domain/boardTypes.js';
import { deriveInquiryRuntimeState } from '../boards/domain/inquiryRuntimeState.js';
import { inquirySelectionModel } from '../services/inquirySelectionModel.js';
import {
    loadAllMatchingBoardRows,
    updateSelectedBoardRows
} from '../services/bulkTableSelectionService.js';
import { useMyTasks } from './useMyTasks.js';

const objectIdPattern = /^[0-9a-f]{24}$/iu;

export const resolveCanonicalRoomId = (room) => {
    const candidate = String(room?.backendId || room?.id || '');
    return objectIdPattern.test(candidate) ? candidate : '';
};

const systemFilters = [
    {
        id: 'all',
        name: 'כל הפניות',
        color: '#3B82F6',
        system: true,
        categoryMode: 'ALL'
    },
    {
        id: 'categorized',
        name: 'פניות עם קטגוריה',
        color: '#6366F1',
        system: true,
        categoryMode: 'CATEGORIZED'
    },
    {
        id: 'uncategorized',
        name: 'ללא קטגוריה',
        color: '#94A3B8',
        system: true,
        categoryMode: 'UNCATEGORIZED'
    }
];

const withoutPagination = (query = {}) => {
    const next = { ...query };
    delete next.page;
    delete next.limit;
    return next;
};

export const useInquiryOrganization = ({
    viewType = 'open',
    toggleState = 'received',
    query = {}
} = {}) => {
    const selectedRoom = useSessionStore(
        (state) => state.selectedRoom
    );
    const authStatus = useSessionStore(
        (state) => state.authStatus
    );
    const authError = useSessionStore(
        (state) => state.authError
    );
    const initializeRuntimeContext = useSessionStore(
        (state) => state.initializeRuntimeContext
    );
    const navigate = useSessionStore(
        (state) => state.navigate
    );

    const roomId = resolveCanonicalRoomId(selectedRoom);
    const roomName = selectedRoom?.name || '';
    const boardType = resolveBoardTypeFromView({
        viewType,
        toggleState
    });
    const taskView = viewType === 'my_tasks';

    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectionScope, setSelectionScope] = useState('NONE');
    const [selectingAll, setSelectingAll] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null);

    const selectedFilter = systemFilters.find(
        (item) => item.id === selectedCategoryId
    );

    const effectiveQuery = useMemo(() => ({
        ...query,
        categoryMode: selectedFilter?.categoryMode || 'ALL',
        categoryId: selectedFilter
            ? undefined
            : selectedCategoryId
    }), [
        query,
        selectedCategoryId,
        selectedFilter?.categoryMode
    ]);

    const selectionQueryKey = useMemo(
        () => JSON.stringify(withoutPagination(effectiveQuery)),
        [effectiveQuery]
    );

    const enabled = Boolean(
        !taskView
        && authStatus === 'authenticated'
        && roomId
        && boardType
    );

    const board = useTicketBoard({
        roomId,
        boardType,
        query: effectiveQuery,
        enabled
    });

    const myTasks = useMyTasks({
        roomId,
        query: effectiveQuery,
        enabled: Boolean(
            taskView
            && authStatus === 'authenticated'
            && roomId
        )
    });

    const clearSelection = () => {
        setSelectedIds([]);
        setSelectedRows([]);
        setSelectionMode(false);
        setSelectionScope('NONE');
        setSelectingAll(false);
        setBulkProgress(null);
    };

    useEffect(() => {
        setSelectedCategoryId('all');
        clearSelection();
    }, [roomId, boardType]);

    useEffect(() => {
        clearSelection();
    }, [selectionQueryKey]);

    const visibleItems = taskView
        ? myTasks.items
        : board.items;

    const rowById = useMemo(() => {
        const map = new Map();

        for (const row of [
            ...selectedRows,
            ...visibleItems
        ]) {
            map.set(row.boardItemId, row);
        }

        return map;
    }, [selectedRows, visibleItems]);

    const commitSelection = (
        ids,
        rows,
        scope = 'CUSTOM'
    ) => {
        const uniqueIds = inquirySelectionModel.unique(ids);
        const allowed = new Set(uniqueIds);

        setSelectionMode(uniqueIds.length > 0);
        setSelectedIds(uniqueIds);
        setSelectedRows(
            rows.filter((row) => allowed.has(row.boardItemId))
        );
        setSelectionScope(
            uniqueIds.length ? scope : 'NONE'
        );
    };

    const toggleSelection = (id) => {
        const exists = selectedIds.includes(id);

        if (exists) {
            commitSelection(
                selectedIds.filter((item) => item !== id),
                selectedRows.filter(
                    (row) => row.boardItemId !== id
                ),
                'CUSTOM'
            );
            return;
        }

        const row = rowById.get(id);

        commitSelection(
            [...selectedIds, id],
            row
                ? [...selectedRows, row]
                : selectedRows,
            'CUSTOM'
        );
    };

    const startSelectionWith = (id) => {
        const row = rowById.get(id);

        commitSelection(
            [...selectedIds, id],
            row
                ? [...selectedRows, row]
                : selectedRows,
            'CUSTOM'
        );
    };

    const selectMany = (ids) => {
        const wanted = new Set(ids);

        commitSelection(
            ids,
            visibleItems.filter(
                (row) => wanted.has(row.boardItemId)
            ),
            'PAGE'
        );
    };

    const toggleCurrentPage = (ids) => {
        const pageIds = inquirySelectionModel.unique(ids);
        const everySelected = (
            pageIds.length > 0
            && pageIds.every(
                (id) => selectedIds.includes(id)
            )
        );

        if (everySelected) {
            const pageSet = new Set(pageIds);

            commitSelection(
                selectedIds.filter(
                    (id) => !pageSet.has(id)
                ),
                selectedRows.filter(
                    (row) => !pageSet.has(row.boardItemId)
                ),
                selectionScope === 'ALL_MATCHING'
                    ? 'CUSTOM'
                    : 'CUSTOM'
            );
            return;
        }

        const mergedIds = inquirySelectionModel.unique([
            ...selectedIds,
            ...pageIds
        ]);
        const pageSet = new Set(pageIds);
        const pageRows = visibleItems.filter(
            (row) => pageSet.has(row.boardItemId)
        );
        const existingRows = new Map(
            selectedRows.map(
                (row) => [row.boardItemId, row]
            )
        );

        for (const row of pageRows) {
            existingRows.set(row.boardItemId, row);
        }

        commitSelection(
            mergedIds,
            [...existingRows.values()],
            'CUSTOM'
        );
    };

    const selectAllMatching = async () => {
        if (
            taskView
            || !roomId
            || !boardType
            || selectingAll
        ) {
            return false;
        }

        setSelectionMode(true);
        setSelectingAll(true);

        try {
            const rows = await loadAllMatchingBoardRows({
                roomId,
                boardType,
                query: effectiveQuery,
                onProgress: ({ completed, total }) => {
                    setBulkProgress({
                        total,
                        completed,
                        succeeded: completed,
                        failed: 0,
                        conflicts: 0,
                        phase: 'selecting'
                    });
                }
            });

            commitSelection(
                rows.map((row) => row.boardItemId),
                rows,
                'ALL_MATCHING'
            );

            setBulkProgress(null);
            return true;
        } finally {
            setSelectingAll(false);
        }
    };

    const categoryCounts = {
        all: taskView
            ? myTasks.pagination.totalItems
            : board.pagination.totalItems
    };

    const categories = [
        ...systemFilters,
        ...board.categories
    ];

    const hasActiveFilters = Boolean(
        String(query.search || '').trim()
        || query.priority
        || (query.pinMode && query.pinMode !== 'ALL')
        || selectedCategoryId !== 'all'
    );

    const viewState = deriveInquiryRuntimeState({
        taskView,
        boardType,
        authStatus,
        authError,
        roomId,
        roomName,
        loaded: taskView ? myTasks.loaded : board.loaded,
        loading: taskView ? myTasks.loading : board.loading,
        refreshing: taskView ? myTasks.refreshing : board.refreshing,
        error: taskView ? myTasks.error : board.error,
        itemCount: visibleItems.length,
        hasActiveFilters
    });

    const retryCurrentState = () => {
        if (viewState.action === 'retry_auth') {
            return initializeRuntimeContext({
                force: true
            });
        }

        if (viewState.action === 'select_room') {
            return navigate('hierarchy');
        }

        return taskView
            ? myTasks.refresh()
            : board.refresh();
    };

    const finishBulk = async (outcome) => {
        if (outcome.failedIds.length) {
            const failedSet = new Set(outcome.failedIds);

            setSelectedIds(outcome.failedIds);
            setSelectedRows(
                selectedRows.filter(
                    (row) => failedSet.has(row.boardItemId)
                )
            );
            setSelectionMode(true);
            setSelectionScope('CUSTOM');
        } else {
            clearSelection();
        }

        await board.refresh();
        return outcome;
    };

    const runBulkStateChange = async (inputForRow) => {
        const selectedSet = new Set(selectedIds);

        const rows = selectedRows.filter(
            (row) => selectedSet.has(row.boardItemId)
        );

        const outcome = await updateSelectedBoardRows({
            roomId,
            boardType,
            rows,
            inputForRow,
            onProgress: setBulkProgress
        });

        return finishBulk(outcome);
    };

    const totalMatchingCount = taskView
        ? myTasks.pagination.totalItems
        : board.pagination.totalItems;

    const allMatchingSelected = Boolean(
        !taskView
        && totalMatchingCount > 0
        && selectedIds.length === totalMatchingCount
        && selectionScope === 'ALL_MATCHING'
    );

    return {
        tickets: visibleItems,
        categories,
        rawCategories: board.categories,
        categoryCounts,
        selectedCategoryId,
        setSelectedCategoryId,
        selectionMode,
        setSelectionMode,
        selectionScope,
        selectedIds,
        setSelectedIds,
        toggleSelection,
        startSelectionWith,
        selectMany,
        toggleCurrentPage,
        selectAllMatching,
        selectingAll,
        allMatchingSelected,
        totalMatchingCount,
        pruneSelection: () => undefined,
        clearSelection,
        loadingIds: board.pendingIds,
        loaded: taskView ? myTasks.loaded : board.loaded,
        loading: taskView ? myTasks.loading : board.loading,
        refreshing: taskView ? myTasks.refreshing : board.refreshing,
        error: (taskView ? myTasks.error : board.error)?.message || '',
        boardError: taskView ? myTasks.error : board.error,
        viewState,
        hasActiveFilters,
        filtersAvailable: !viewState.blocking,
        retryCurrentState,
        conflict: board.conflict,
        retryConflict: board.retryConflict,
        pagination: taskView ? myTasks.pagination : board.pagination,
        capabilities: taskView
            ? {
                canChangeCategory: false,
                canChangePin: false
            }
            : board.capabilities,
        bulkProgress: bulkProgress || board.bulkProgress,
        realtimeConnected: taskView
            ? myTasks.realtimeConnected
            : board.realtimeConnected,
        boardType,
        boardLabel: BOARD_LABELS[boardType] || '',
        roomId,
        roomName,
        refresh: taskView
            ? myTasks.refresh
            : board.refresh,
        selectOrganizationalRoom: () => navigate('hierarchy'),
        togglePin: (id) => {
            const item = board.items.find(
                (row) => row.boardItemId === id
            );

            return board.setPinned(
                id,
                !item?.isPinned
            );
        },
        createCategory: board.createCategory,
        renameCategory: board.updateCategory,
        deleteCategory: board.archiveCategory,
        assignCategory: (itemId, categoryId) => (
            board.assignCategory(
                itemId,
                categoryId === 'all'
                    ? null
                    : categoryId
            )
        ),
        assignManyCategory: (categoryId) => (
            runBulkStateChange(() => ({
                categoryId: categoryId === 'all'
                    ? null
                    : categoryId
            }))
        ),
        setManyPinned: (pinned) => (
            runBulkStateChange(() => ({
                isPinned: pinned
            }))
        ),
        canManageCategories: board.capabilities.canChangeCategory,
        pendingCategoryIds: board.pendingCategoryIds
    };
};
