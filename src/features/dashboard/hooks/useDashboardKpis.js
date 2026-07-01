import { useEffect, useMemo, useState } from 'react';
import {
    loadDashboardKpiLayout,
    moveDashboardKpiId,
    persistDashboardKpiLayout,
    sanitizeDashboardKpiIds
} from '../utils/dashboard.utils.js';

export function useDashboardKpis({ openedToday, openInquiries, closedInquiries }) {
    const [isKpiEditorOpen, setIsKpiEditorOpen] = useState(false);
    const [selectedKpiIds, setSelectedKpiIds] = useState(() => loadDashboardKpiLayout());
    const [draftKpiIds, setDraftKpiIds] = useState(() => loadDashboardKpiLayout());
    const [undoState, setUndoState] = useState(null);

    const kpiDefinitions = useMemo(() => ([
        { id: 'open', title: 'פניות פתוחות', subtitle: `${openedToday} נפתחו היום`, value: openInquiries, icon: 'chartBar', accent: 'amber' },
        { id: 'overdue', title: 'פניות באיחור', subtitle: 'דורש טיפול עכשיו', value: 12, icon: 'clock', accent: 'rose' },
        { id: 'urgent', title: 'דחופות פתוחות', subtitle: 'דורשות התערבות', value: 5, icon: 'target', accent: 'rose' },
        { id: 'unassigned', title: 'ללא גורם מטפל', subtitle: 'ממתינות לשיוך', value: 7, icon: 'user', accent: 'amber' },
        { id: 'averageTime', title: 'זמן טיפול ממוצע', subtitle: 'בשעות, מהשבוע', value: 6.4, icon: 'dashboard', accent: 'blue' },
        { id: 'recentlyHandled', title: 'טופלו לאחרונה', subtitle: 'ב-7 ימים אחרונים', value: closedInquiries, icon: 'check', accent: 'emerald' }
    ]), [openedToday, openInquiries, closedInquiries]);

    const selectedKpis = useMemo(
        () => selectedKpiIds.map((id) => kpiDefinitions.find((kpi) => kpi.id === id)).filter(Boolean),
        [selectedKpiIds, kpiDefinitions]
    );

    useEffect(() => {
        if (!undoState) return undefined;

        const timerId = window.setTimeout(() => {
            setUndoState(null);
        }, 4200);

        return () => window.clearTimeout(timerId);
    }, [undoState]);

    const normalizeKpiIds = (ids) => {
        const availableIds = kpiDefinitions.map((kpi) => kpi.id);
        const uniqueIds = [];

        (Array.isArray(ids) ? ids : []).forEach((id) => {
            if (availableIds.includes(id) && !uniqueIds.includes(id)) {
                uniqueIds.push(id);
            }
        });

        return uniqueIds.slice(0, Math.min(6, availableIds.length));
    };

    const persistSelectedKpis = (nextIds) => {
        const normalizedIds = normalizeKpiIds(nextIds);
        setSelectedKpiIds(normalizedIds);
        setDraftKpiIds(normalizedIds);
        persistDashboardKpiLayout(normalizedIds);
        return normalizedIds;
    };

    const openKpiEditor = () => {
        setDraftKpiIds(selectedKpiIds);
        setIsKpiEditorOpen(true);
    };

    const closeKpiEditor = () => {
        setDraftKpiIds(selectedKpiIds);
        setIsKpiEditorOpen(false);
    };

    const handleDraftAddKpi = (kpiId) => {
        setDraftKpiIds((currentIds) => (currentIds.includes(kpiId) || currentIds.length >= 6 ? currentIds : [...currentIds, kpiId]));
    };

    const handleDraftRemoveKpi = (kpiId) => {
        setDraftKpiIds((currentIds) => currentIds.filter((id) => id !== kpiId));
    };

    const handleDraftMoveKpi = (fromIndex, toIndex) => {
        setDraftKpiIds((currentIds) => moveDashboardKpiId(currentIds, fromIndex, toIndex));
    };

    const handleSaveKpiLayout = () => {
        const sanitizedIds = normalizeKpiIds(draftKpiIds);
        setSelectedKpiIds(sanitizedIds);
        setDraftKpiIds(sanitizedIds);
        persistDashboardKpiLayout(sanitizedIds);
        setIsKpiEditorOpen(false);
    };

    const removeSelectedKpi = (kpiId) => {
        setSelectedKpiIds((currentIds) => {
            if (!currentIds.includes(kpiId)) return currentIds;
            const nextIds = currentIds.filter((id) => id !== kpiId);
            persistDashboardKpiLayout(nextIds);
            setDraftKpiIds(nextIds);
            setUndoState({
                removedId: kpiId,
                previousIds: currentIds
            });
            return nextIds;
        });
    };

    const restoreRemovedKpi = () => {
        if (!undoState?.previousIds) return;
        persistSelectedKpis(undoState.previousIds);
        setUndoState(null);
    };

    const dismissUndo = () => setUndoState(null);

    return {
        isKpiEditorOpen,
        selectedKpis,
        draftKpiIds,
        kpiDefinitions,
        undoState,
        openKpiEditor,
        closeKpiEditor,
        handleDraftAddKpi,
        handleDraftRemoveKpi,
        handleDraftMoveKpi,
        handleSaveKpiLayout,
        removeSelectedKpi,
        restoreRemovedKpi,
        dismissUndo
    };
}

