import { useEffect, useMemo, useState } from 'react';
import { loadDashboardKpiLayout, moveDashboardKpiId, persistDashboardKpiLayout } from '../utils/dashboard.utils.js';

export function useDashboardKpis({ metrics }) {
    const [isKpiEditorOpen, setIsKpiEditorOpen] = useState(false);
    const [selectedKpiIds, setSelectedKpiIds] = useState(() => loadDashboardKpiLayout());
    const [draftKpiIds, setDraftKpiIds] = useState(() => loadDashboardKpiLayout());
    const [undoState, setUndoState] = useState(null);
    const values = metrics || {};

    const kpiDefinitions = useMemo(() => ([
        { id: 'open', title: 'פניות פתוחות', subtitle: `${values.openedToday || 0} נפתחו היום`, value: values.open || 0, icon: 'chartBar', accent: 'amber' },
        { id: 'overdue', title: 'פניות באיחור', subtitle: 'פתוחות מעל 48 שעות', value: values.overdue || 0, icon: 'clock', accent: 'rose' },
        { id: 'urgent', title: 'דחופות פתוחות', subtitle: 'דחיפות גבוהה או קריטית', value: values.urgentOpen || 0, icon: 'target', accent: 'rose' },
        { id: 'unassigned', title: 'ללא גורם מטפל', subtitle: 'פניות פתוחות ללא שיוך', value: values.unassigned || 0, icon: 'user', accent: 'amber' },
        { id: 'averageTime', title: 'זמן טיפול ממוצע', subtitle: 'בשעות, לפניות שנסגרו', value: values.averageHandlingHours || 0, icon: 'dashboard', accent: 'blue' },
        { id: 'recentlyHandled', title: 'טופלו לאחרונה', subtitle: 'ב־7 הימים האחרונים', value: values.recentlyHandled || 0, icon: 'check', accent: 'emerald' }
    ]), [values.openedToday, values.open, values.overdue, values.urgentOpen, values.unassigned, values.averageHandlingHours, values.recentlyHandled]);

    const selectedKpis = useMemo(() => selectedKpiIds.map((id) => kpiDefinitions.find((kpi) => kpi.id === id)).filter(Boolean), [selectedKpiIds, kpiDefinitions]);
    useEffect(() => {
        if (!undoState) return undefined;
        const timerId = window.setTimeout(() => setUndoState(null), 4200);
        return () => window.clearTimeout(timerId);
    }, [undoState]);
    const normalizeKpiIds = (ids) => {
        const availableIds = kpiDefinitions.map((kpi) => kpi.id);
        return [...new Set(Array.isArray(ids) ? ids : [])].filter((id) => availableIds.includes(id)).slice(0, 6);
    };
    const persistSelectedKpis = (nextIds) => {
        const normalizedIds = normalizeKpiIds(nextIds);
        setSelectedKpiIds(normalizedIds); setDraftKpiIds(normalizedIds); persistDashboardKpiLayout(normalizedIds);
    };
    const openKpiEditor = () => { setDraftKpiIds(selectedKpiIds); setIsKpiEditorOpen(true); };
    const closeKpiEditor = () => { setDraftKpiIds(selectedKpiIds); setIsKpiEditorOpen(false); };
    const handleDraftAddKpi = (id) => setDraftKpiIds((current) => current.includes(id) || current.length >= 6 ? current : [...current, id]);
    const handleDraftRemoveKpi = (id) => setDraftKpiIds((current) => current.filter((item) => item !== id));
    const handleDraftMoveKpi = (from, to) => setDraftKpiIds((current) => moveDashboardKpiId(current, from, to));
    const handleSaveKpiLayout = () => { persistSelectedKpis(draftKpiIds); setIsKpiEditorOpen(false); };
    const removeSelectedKpi = (id) => setSelectedKpiIds((current) => {
        if (!current.includes(id)) return current;
        const next = current.filter((item) => item !== id);
        persistDashboardKpiLayout(next); setDraftKpiIds(next); setUndoState({ removedId: id, previousIds: current });
        return next;
    });
    const restoreRemovedKpi = () => { if (undoState?.previousIds) persistSelectedKpis(undoState.previousIds); setUndoState(null); };
    return {
        isKpiEditorOpen, selectedKpis, draftKpiIds, kpiDefinitions, undoState,
        openKpiEditor, closeKpiEditor, handleDraftAddKpi, handleDraftRemoveKpi,
        handleDraftMoveKpi, handleSaveKpiLayout, removeSelectedKpi, restoreRemovedKpi,
        dismissUndo: () => setUndoState(null)
    };
}