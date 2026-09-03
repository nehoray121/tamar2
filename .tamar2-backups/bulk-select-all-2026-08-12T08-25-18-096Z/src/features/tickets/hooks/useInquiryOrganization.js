import { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { useTicketBoard } from '../boards/hooks/useTicketBoard.js';
import { BOARD_LABELS, resolveBoardTypeFromView } from '../boards/domain/boardTypes.js';
import { deriveInquiryRuntimeState } from '../boards/domain/inquiryRuntimeState.js';
import { inquirySelectionModel } from '../services/inquirySelectionModel.js';
import { useMyTasks } from './useMyTasks.js';

const objectIdPattern = /^[0-9a-f]{24}$/iu;

export const resolveCanonicalRoomId = (room) => {
    const candidate = String(room?.backendId || room?.id || '');
    return objectIdPattern.test(candidate) ? candidate : '';
};

const systemFilters = [
    { id: 'all', name: 'כל הפניות', color: '#3B82F6', system: true, categoryMode: 'ALL' },
    { id: 'categorized', name: 'פניות עם קטגוריה', color: '#6366F1', system: true, categoryMode: 'CATEGORIZED' },
    { id: 'uncategorized', name: 'ללא קטגוריה', color: '#94A3B8', system: true, categoryMode: 'UNCATEGORIZED' }
];

export const useInquiryOrganization = ({ viewType = 'open', toggleState = 'received', query = {} } = {}) => {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const authStatus = useSessionStore((state) => state.authStatus);
    const authError = useSessionStore((state) => state.authError);
    const initializeRuntimeContext = useSessionStore((state) => state.initializeRuntimeContext);
    const navigate = useSessionStore((state) => state.navigate);
    const roomId = resolveCanonicalRoomId(selectedRoom);
    const roomName = selectedRoom?.name || '';
    const boardType = resolveBoardTypeFromView({ viewType, toggleState });
    const taskView = viewType === 'my_tasks';
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const selectedFilter = systemFilters.find((item) => item.id === selectedCategoryId);
    const effectiveQuery = useMemo(() => ({
        ...query,
        categoryMode: selectedFilter?.categoryMode || 'ALL',
        categoryId: selectedFilter ? undefined : selectedCategoryId
    }), [query, selectedCategoryId, selectedFilter?.categoryMode]);
    const enabled = Boolean(!taskView && authStatus === 'authenticated' && roomId && boardType);
    const board = useTicketBoard({ roomId, boardType, query: effectiveQuery, enabled });

    const myTasks = useMyTasks({
        roomId,
        query: effectiveQuery,
        enabled: Boolean(taskView && authStatus === 'authenticated' && roomId)
    });
    useEffect(() => {
        setSelectedCategoryId('all');
        setSelectedIds([]);
        setSelectionMode(false);
    }, [roomId, boardType]);

    const visibleItems = taskView ? myTasks.items : board.items;

    useEffect(() => {
        const validIds = visibleItems.map((item) => item.boardItemId);
        setSelectedIds((current) => inquirySelectionModel.prune(current, validIds));
    }, [visibleItems]);

    const toggleSelection = (id) => {
        setSelectedIds((current) => current.includes(id)
            ? current.filter((item) => item !== id)
            : inquirySelectionModel.unique([...current, id]));
    };
    const startSelectionWith = (id) => {
        setSelectionMode(true);
        setSelectedIds((current) => inquirySelectionModel.unique([...current, id]));
    };
    const selectMany = (ids) => {
        setSelectionMode(true);
        setSelectedIds(inquirySelectionModel.unique(ids));
    };
    const clearSelection = () => {
        setSelectedIds([]);
        setSelectionMode(false);
    };

    const categoryCounts = { all: taskView ? myTasks.pagination.totalItems : board.pagination.totalItems };
    const categories = [...systemFilters, ...board.categories];
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
        if (viewState.action === 'retry_auth') return initializeRuntimeContext({ force: true });
        if (viewState.action === 'select_room') return navigate('hierarchy');
        return taskView ? myTasks.refresh() : board.refresh();
    };

    const finishBulk = async (operation) => {
        const outcome = await operation;
        if (outcome.failedIds.length) {
            setSelectedIds(outcome.failedIds);
            setSelectionMode(true);
        } else {
            clearSelection();
        }
        return outcome;
    };

    return {
        tickets: visibleItems,
        categories,
        rawCategories: board.categories,
        categoryCounts,
        selectedCategoryId,
        setSelectedCategoryId,
        selectionMode,
        setSelectionMode,
        selectedIds,
        setSelectedIds,
        toggleSelection,
        startSelectionWith,
        selectMany,
        pruneSelection: (validIds) => setSelectedIds((current) => inquirySelectionModel.prune(current, validIds)),
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
        capabilities: taskView ? { canChangeCategory: false, canChangePin: false } : board.capabilities,
        bulkProgress: board.bulkProgress,
        realtimeConnected: taskView ? myTasks.realtimeConnected : board.realtimeConnected,
        boardType,
        boardLabel: BOARD_LABELS[boardType] || '',
        roomId,
        roomName,
        refresh: taskView ? myTasks.refresh : board.refresh,
        selectOrganizationalRoom: () => navigate('hierarchy'),
        togglePin: (id) => {
            const item = board.items.find((row) => row.boardItemId === id);
            return board.setPinned(id, !item?.isPinned);
        },
        createCategory: board.createCategory,
        renameCategory: board.updateCategory,
        deleteCategory: board.archiveCategory,
        assignCategory: (itemId, categoryId) => board.assignCategory(itemId, categoryId === 'all' ? null : categoryId),
        assignManyCategory: (categoryId) => finishBulk(board.assignManyCategory(selectedIds, categoryId === 'all' ? null : categoryId)),
        setManyPinned: (pinned) => finishBulk(board.setManyPinned(selectedIds, pinned)),
        canManageCategories: Boolean(board.capabilities.canManageCategories),
        pendingCategoryIds: board.pendingCategoryIds
    };
};
