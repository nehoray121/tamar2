import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { subscribeBoardRealtime } from '../../tickets/boards/realtime/boardSocket.js';
import { settingsRepository } from '../../settings/services/settingsRepository.js';

const defaultFilters = Object.freeze({ dateFrom: '', dateTo: '', grouping: 'monthly', category: 'period', sortOrder: 'desc' });
const emptyData = Object.freeze({
    metrics: { total: 0, open: 0, closed: 0, overdue: 0, urgentOpen: 0, unassigned: 0, recentlyHandled: 0, openedToday: 0, averageHandlingHours: 0 },
    trend: [], categoryTrend: [], priorityData: [], workload: [], attention: [], inquiries: []
});
const sortOptions = Object.freeze([
    { value: 'desc', label: 'מהגבוה לנמוך' },
    { value: 'asc', label: 'מהנמוך לגבוה' }
]);

// tamar-dashboard-room-field-categories:v1
const CATEGORY_FIELD_TYPES = new Set(['select', 'multiselect', 'text', 'phone', 'user', 'date']);
const CATEGORY_EXCLUDED_IDS = new Set(['status', 'openDate', 'closingDate', 'description']);
const FIXED_CATEGORY_FIELDS = Object.freeze([{ id: 'customerName', name: 'שם לקוח', type: 'text', active: true, visible: true }]);
const PRIORITY_CATEGORY_LABELS = Object.freeze({ CRITICAL: 'גבוהה-1', HIGH: 'גבוהה-1', MEDIUM: 'בינונית-2', LOW: 'נמוכה-3' });
const isCategoryField = (field) => Boolean(
    field?.id
    && field.active !== false
    && field.visible !== false
    && CATEGORY_FIELD_TYPES.has(field.type)
    && !CATEGORY_EXCLUDED_IDS.has(field.id)
);
const normalizeCategoryFields = (fields) => {
    const normalized = (fields || []).filter(isCategoryField);
    const ids = new Set(normalized.map((field) => field.id));
    FIXED_CATEGORY_FIELDS.forEach((field) => { if (!ids.has(field.id)) normalized.push(field); });
    return normalized;
};
const displayCategoryLabel = (field, label) => field?.id === 'priority'
    ? (PRIORITY_CATEGORY_LABELS[label] || label)
    : label;
const mergeCategoryBars = (bars, field) => {
    const byLabel = new Map();
    (bars || []).forEach((bar) => {
        const label = String(displayCategoryLabel(field, bar.label) || 'ללא ערך').trim() || 'ללא ערך';
        const current = byLabel.get(label) || { label, sortKey: label, total: 0, items: [] };
        current.total += Number(bar.total) || 0;
        current.items.push(...(bar.items || []));
        byLabel.set(label, current);
    });
    (field?.options || []).forEach((option) => {
        const label = String(option || '').trim();
        if (label && !byLabel.has(label)) byLabel.set(label, { label, sortKey: label, total: 0, items: [] });
    });
    return [...byLabel.values()];
};

export function useDashboardData() {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const authStatus = useSessionStore((state) => state.authStatus);
    const [filters, setFilters] = useState(defaultFilters);
    const [categoryFields, setCategoryFields] = useState([]);
    const [state, setState] = useState({ status: 'idle', data: emptyData, error: '' });
    const requestSequence = useRef(0);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !selectedRoom?.id) {
            setCategoryFields([]);
            return undefined;
        }
        let alive = true;
        settingsRepository.load(selectedRoom.id).then((result) => {
            if (!alive) return;
            setCategoryFields(normalizeCategoryFields(result.settings?.fields || []));
        }).catch(() => {
            if (alive) setCategoryFields([]);
        });
        return () => { alive = false; };
    }, [authStatus, selectedRoom?.id]);

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
                groupField: filters.category === 'period' ? undefined : filters.category
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

    const categoryFieldById = useMemo(() => new Map(categoryFields.map((field) => [field.id, field])), [categoryFields]);
    const selectedCategoryField = filters.category === 'period' ? null : categoryFieldById.get(filters.category) || null;

    useEffect(() => {
        if (filters.category === 'period' || categoryFieldById.has(filters.category)) return;
        setFilters((current) => ({ ...current, category: 'period' }));
    }, [categoryFieldById, filters.category]);

    const groupedBarData = useMemo(() => {
        const source = filters.category === 'period'
            ? [...(state.data.trend || [])]
            : mergeCategoryBars(state.data.categoryTrend || [], selectedCategoryField);
        return filters.sortOrder === 'asc'
            ? source.sort((a, b) => a.total - b.total || a.label.localeCompare(b.label))
            : source.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
    }, [state.data.trend, state.data.categoryTrend, filters.category, filters.sortOrder, selectedCategoryField]);
    const categoryOptions = useMemo(() => [
        { value: 'period', label: 'לפי תקופה' },
        ...categoryFields.map((field) => ({ value: field.id, label: field.name || field.id }))
    ], [categoryFields]);

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
        selectedCategoryField,
        hasActiveFilters: Boolean(filters.dateFrom || filters.dateTo)
    };
}