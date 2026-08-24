import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { subscribeBoardRealtime } from '../../tickets/boards/realtime/boardSocket.js';

const defaultFilters = Object.freeze({ dateFrom: '', dateTo: '', grouping: 'monthly', category: 'all', sortOrder: 'desc' });
const emptyData = Object.freeze({
    metrics: { total: 0, open: 0, closed: 0, overdue: 0, urgentOpen: 0, unassigned: 0, recentlyHandled: 0, openedToday: 0, averageHandlingHours: 0 },
    trend: [], priorityData: [], workload: [], attention: [], inquiries: []
});
const sortOptions = Object.freeze([
    { value: 'desc', label: 'מהגבוה לנמוך' },
    { value: 'asc', label: 'מהנמוך לגבוה' }
]);

export function useDashboardData() {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const authStatus = useSessionStore((state) => state.authStatus);
    const [filters, setFilters] = useState(defaultFilters);
    const [state, setState] = useState({ status: 'idle', data: emptyData, error: '' });
    const requestSequence = useRef(0);

    const load = useCallback(async ({ signal } = {}) => {
        if (authStatus !== 'authenticated') return;
        const sequence = ++requestSequence.current;
        setState((current) => ({ ...current, status: current.status === 'ready' ? 'refreshing' : 'loading', error: '' }));
        try {
            const response = await dashboardApi.getDashboard({
                roomId: selectedRoom?.id || undefined,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                grouping: filters.grouping,
                assigneeId: filters.category
            }, { signal });
            if (sequence !== requestSequence.current) return;
            setState({ status: 'ready', data: response.data || emptyData, error: '' });
        } catch (error) {
            if (error?.name === 'AbortError' || sequence !== requestSequence.current) return;
            setState((current) => ({ ...current, status: 'error', error: error?.message || 'לא ניתן לטעון את נתוני לוח הבקרה.' }));
        }
    }, [authStatus, selectedRoom?.id, filters.dateFrom, filters.dateTo, filters.grouping, filters.category]);

    useEffect(() => {
        const controller = new AbortController();
        load({ signal: controller.signal });
        return () => controller.abort();
    }, [load]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !selectedRoom?.id) return undefined;
        const subscriptions = ['OPEN', 'CLOSED'].map((boardType) => subscribeBoardRealtime({
            roomId: selectedRoom.id,
            boardType,
            onInvalidate: () => load()
        }));
        return () => subscriptions.forEach((unsubscribe) => unsubscribe?.());
    }, [authStatus, selectedRoom?.id, load]);

    const groupedBarData = useMemo(() => {
        const items = [...(state.data.trend || [])];
        return filters.sortOrder === 'asc'
            ? items.sort((a, b) => a.total - b.total || a.label.localeCompare(b.label))
            : items.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
    }, [state.data.trend, filters.sortOrder]);
    const categoryOptions = useMemo(() => [
        { value: 'all', label: 'כל המטפלים' },
        ...(state.data.workload || []).map((item) => ({ value: item.userId, label: item.name }))
    ], [state.data.workload]);

    return {
        ...state,
        data: state.data || emptyData,
        retry: () => load(),
        filters,
        setFilters,
        filteredBarData: state.data.inquiries || [],
        groupedBarData,
        categoryOptions,
        sortOptions,
        hasActiveFilters: Boolean(filters.dateFrom || filters.dateTo || filters.category !== 'all')
    };
}