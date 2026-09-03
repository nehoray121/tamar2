import { useEffect, useMemo, useState } from 'react';
import { loadDashboardKpiLayout, moveDashboardKpiId, persistDashboardKpiLayout } from '../utils/dashboard.utils.js';

export function useDashboardKpis({ metrics }) {
    const [isKpiEditorOpen, setIsKpiEditorOpen] = useState(false);
    const [selectedKpiIds, setSelectedKpiIds] = useState(() => loadDashboardKpiLayout());
    const [draftKpiIds, setDraftKpiIds] = useState(() => loadDashboardKpiLayout());
    const [undoState, setUndoState] = useState(null);
    const values = metrics || {};

    const kpiDefinitions = useMemo(() => {
        const total = Number(values.total) || 0;
        const open = Number(values.open) || 0;
        const closed = Number(values.closed) || 0;
        const overdue = Number(values.overdue) || 0;
        const urgentOpen = Number(values.urgentOpen) || 0;
        const unassigned = Number(values.unassigned) || 0;
        const openedToday = Number(values.openedToday) || 0;
        const recentlyHandled = Number(values.recentlyHandled) || 0;
        const averageHandlingHours = Number(values.averageHandlingHours) || 0;
        const percent = (part, whole) => whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';

        return [
            { id: 'open', title: 'פניות פתוחות', subtitle: `${openedToday} נפתחו היום`, value: open, icon: 'chartBar', accent: 'amber' },
            { id: 'overdue', title: 'פניות באיחור', subtitle: 'פתוחות מעל 48 שעות', value: overdue, icon: 'clock', accent: 'rose' },
            { id: 'urgent', title: 'דחופות פתוחות', subtitle: 'דחיפות גבוהה או בינונית', value: urgentOpen, icon: 'target', accent: 'rose' },
            { id: 'unassigned', title: 'ללא גורם מטפל', subtitle: 'פניות פתוחות ללא שיוך', value: unassigned, icon: 'user', accent: 'amber' },
            { id: 'averageTime', title: 'זמן טיפול ממוצע', subtitle: 'בשעות, לפניות שנסגרו', value: averageHandlingHours, icon: 'dashboard', accent: 'blue' },
            { id: 'recentlyHandled', title: 'טופלו לאחרונה', subtitle: 'ב־7 הימים האחרונים', value: recentlyHandled, icon: 'check', accent: 'emerald' },

            // tamar-dashboard-extra-kpi-catalog:v2
            { id: 'total', title: 'סה״כ פניות', subtitle: 'כל הפניות בטווח הנוכחי', value: total, icon: 'list', accent: 'violet' },
            { id: 'closed', title: 'פניות סגורות', subtitle: 'כל הפניות שהסתיימו', value: closed, icon: 'check', accent: 'emerald' },
            { id: 'openedToday', title: 'נפתחו היום', subtitle: 'פניות שנוצרו מאז תחילת היום', value: openedToday, icon: 'calendar', accent: 'cyan' },
            { id: 'closureRate', title: 'אחוז סגירה', subtitle: 'פניות סגורות מתוך כלל הפניות', value: percent(closed, total), icon: 'check', accent: 'emerald' },
            { id: 'unassignedRate', title: 'אחוז ללא מטפל', subtitle: 'מתוך הפניות הפתוחות', value: percent(unassigned, open), icon: 'user', accent: 'amber' },
            { id: 'overdueRate', title: 'אחוז באיחור', subtitle: 'מתוך הפניות הפתוחות', value: percent(overdue, open), icon: 'clock', accent: 'rose' },
            { id: 'urgentRate', title: 'אחוז דחופות', subtitle: 'מתוך הפניות הפתוחות', value: percent(urgentOpen, open), icon: 'target', accent: 'rose' },
            { id: 'assignedOpen', title: 'פתוחות עם מטפל', subtitle: 'פניות פתוחות שכבר משויכות', value: Math.max(0, open - unassigned), icon: 'user', accent: 'blue' }
        ];
    }, [values.total, values.open, values.closed, values.overdue, values.urgentOpen, values.unassigned, values.openedToday, values.recentlyHandled, values.averageHandlingHours]);

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