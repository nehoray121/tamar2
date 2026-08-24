import { DASHBOARD_KPI_AVAILABLE_IDS, DASHBOARD_KPI_STORAGE_KEY, DEFAULT_DASHBOARD_KPI_IDS } from '../constants/dashboard.constants.js';

const dashboardPad = (value) => String(value).padStart(2, '0');
const parseDashboardDate = (dateString) => {
    const parts = String(dateString).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
};
const formatDashboardDate = (dateString, options) => parseDashboardDate(dateString).toLocaleDateString('he-IL', options);
const sanitizeDashboardKpiIds = (ids, availableIds = DASHBOARD_KPI_AVAILABLE_IDS) => {
    const uniqueIds = [];
    (Array.isArray(ids) ? ids : []).forEach((id) => {
        if (availableIds.includes(id) && !uniqueIds.includes(id)) uniqueIds.push(id);
    });
    availableIds.forEach((id) => {
        if (!uniqueIds.includes(id) && uniqueIds.length < 4) uniqueIds.push(id);
    });
    return uniqueIds.slice(0, Math.min(6, availableIds.length));
};
const loadDashboardKpiLayout = () => {
    if (typeof window === 'undefined') return DEFAULT_DASHBOARD_KPI_IDS;
    try {
        const storedValue = window.localStorage.getItem(DASHBOARD_KPI_STORAGE_KEY);
        if (!storedValue) return DEFAULT_DASHBOARD_KPI_IDS;
        const parsedValue = JSON.parse(storedValue);
        return sanitizeDashboardKpiIds(Array.isArray(parsedValue) ? parsedValue : parsedValue?.visibleIds, DASHBOARD_KPI_AVAILABLE_IDS);
    } catch {
        return DEFAULT_DASHBOARD_KPI_IDS;
    }
};
const persistDashboardKpiLayout = (visibleIds) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(DASHBOARD_KPI_STORAGE_KEY, JSON.stringify({ visibleIds }));
};
const moveDashboardKpiId = (ids, fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= ids.length || fromIndex === toIndex) return ids;
    const reorderedIds = [...ids];
    const [movedId] = reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, movedId);
    return reorderedIds;
};
const formatDashboardShortName = (fullName) => {
    const [firstName = '', lastName = ''] = String(fullName || '').split(' ');
    return lastName ? `${firstName} ${lastName.charAt(0)}.` : String(fullName || '');
};
const filterDashboardInquiries = (inquiries, filters) => inquiries.filter((item) => {
    if (filters.category !== 'all' && item.assignee !== filters.category) return false;
    if (filters.dateFrom && item.date < filters.dateFrom) return false;
    if (filters.dateTo && item.date > filters.dateTo) return false;
    return true;
});
const groupDashboardInquiries = (inquiries, grouping) => {
    const groups = new Map();
    inquiries.forEach((item) => {
        const date = parseDashboardDate(item.date);
        let label = ''; let sortKey = item.date;
        if (grouping === 'daily') label = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
        else if (grouping === 'weekly') {
            const firstDay = new Date(date.getFullYear(), 0, 1);
            const week = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
            label = `שבוע ${week}`; sortKey = `${date.getFullYear()}-${dashboardPad(week)}`;
        } else {
            label = date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
            sortKey = `${date.getFullYear()}-${dashboardPad(date.getMonth() + 1)}`;
        }
        if (!groups.has(label)) groups.set(label, { label, total: 0, items: [], sortKey });
        const group = groups.get(label); group.total += 1; group.items.push(item);
    });
    return [...groups.values()];
};
const sortDashboardGroups = (groups, sortOrder) => [...groups].sort((a, b) => {
    const totalSort = sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
    return totalSort || a.sortKey.localeCompare(b.sortKey);
});
const exportDashboardCsv = (groups) => {
    const headers = ['קבוצה', 'סה״כ בקבוצה', 'מספר פנייה', 'תאריך', 'גורם מטפל', 'דחיפות', 'סטטוס', 'טלפון', 'שם הפונה', 'מיקום', 'נושא'];
    const rows = groups.flatMap((group) => group.items.map((item) => [group.label, group.total, item.id, item.date, item.assignee, item.priority, item.status === 'open' ? 'פתוחה' : 'סגורה', item.phone, item.requester, item.location, item.subject]));
    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `ייצוא_פניות_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
};

export { dashboardPad, parseDashboardDate, formatDashboardDate, sanitizeDashboardKpiIds, loadDashboardKpiLayout, persistDashboardKpiLayout, moveDashboardKpiId, formatDashboardShortName, filterDashboardInquiries, groupDashboardInquiries, sortDashboardGroups, exportDashboardCsv };