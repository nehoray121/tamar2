import { useMemo, useState } from 'react';
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
        setDraftKpiIds((currentIds) => (currentIds.length <= 4 ? currentIds : currentIds.filter((id) => id !== kpiId)));
    };

    const handleDraftMoveKpi = (fromIndex, toIndex) => {
        setDraftKpiIds((currentIds) => moveDashboardKpiId(currentIds, fromIndex, toIndex));
    };

    const handleSaveKpiLayout = () => {
        const sanitizedIds = sanitizeDashboardKpiIds(draftKpiIds, kpiDefinitions.map((kpi) => kpi.id));
        setSelectedKpiIds(sanitizedIds);
        persistDashboardKpiLayout(sanitizedIds);
        setIsKpiEditorOpen(false);
    };

    return {
        isKpiEditorOpen,
        selectedKpis,
        draftKpiIds,
        kpiDefinitions,
        openKpiEditor,
        closeKpiEditor,
        handleDraftAddKpi,
        handleDraftRemoveKpi,
        handleDraftMoveKpi,
        handleSaveKpiLayout
    };
}
