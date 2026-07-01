import { dashboardAssignees, dashboardPriorities } from '../data/dashboard.mock.js';
import { DASHBOARD_KPI_STORAGE_KEY, DEFAULT_DASHBOARD_KPI_IDS } from '../constants/dashboard.constants.js';

        const dashboardDeterministicRandom = (seed) => {
            const x = Math.sin(seed * 999) * 10000;
            return x - Math.floor(x);
        };

        const dashboardPad = (value) => String(value).padStart(2, '0');

        const parseDashboardDate = (dateString) => {
            const parts = dateString.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        const formatDashboardDate = (dateString, options) => {
            return parseDashboardDate(dateString).toLocaleDateString('he-IL', options);
        };

        const generateDashboardMockData = () => {
            const requesters = ['עטיה נהוראי', 'משה כהן', 'דנה לוי', 'רועי שמש', 'אבי כץ', 'מיכל דוד', 'דניאל כהן'];
            const subjects = ['בעיה בהרשאות', 'עדכון פרטי משתמש', 'בקשת תמיכה', 'תקלה בתהליך', 'פתיחת משימה חדשה', 'בירור סטטוס', 'חיבור לאוטומציה'];
            const descriptions = [
                'הפנייה דורשת בדיקה ראשונית ותיאום מול הגורם המטפל.',
                'נדרש טיפול נקודתי והשלמת נתונים חסרים לפני סגירה.',
                'התקבלה פנייה חדשה וממתינה לאישור המשך טיפול.',
                'הנושא נמצא בבדיקה מול הצוות הרלוונטי.'
            ];

            return Array.from({ length: 150 }, (_, i) => {
                const priority = dashboardPriorities[Math.floor(dashboardDeterministicRandom(i + 7) * dashboardPriorities.length)];
                const date = new Date(2026, 3, 1 + Math.floor(dashboardDeterministicRandom(i + 23) * 115));
                if (i < 8) {
                    date.setTime(new Date().getTime());
                }

                return {
                    id: `M-16-${100 + i}`,
                    requester: requesters[Math.floor(dashboardDeterministicRandom(i + 11) * requesters.length)],
                    phone: dashboardDeterministicRandom(i + 13) > 0.3 ? `05${Math.floor(dashboardDeterministicRandom(i + 15) * 10)}-${Math.floor(1000000 + dashboardDeterministicRandom(i + 17) * 9000000)}` : 'לא זמין',
                    location: `${Math.floor(111111111 + dashboardDeterministicRandom(i + 19) * 888888888)}`,
                    priority: priority.label,
                    priorityLevel: priority.level,
                    priorityColor: priority.color,
                    chartColor: priority.chartColor,
                    date: `${date.getFullYear()}-${dashboardPad(date.getMonth() + 1)}-${dashboardPad(date.getDate())}`,
                    status: dashboardDeterministicRandom(i + 29) > 0.34 ? 'open' : 'closed',
                    assignee: dashboardAssignees[Math.floor(dashboardDeterministicRandom(i + 31) * dashboardAssignees.length)],
                    subject: subjects[Math.floor(dashboardDeterministicRandom(i + 37) * subjects.length)],
                    description: descriptions[Math.floor(dashboardDeterministicRandom(i + 41) * descriptions.length)]
                };
            });
        };

        const sanitizeDashboardKpiIds = (ids, availableIds = DEFAULT_DASHBOARD_KPI_IDS) => {
            const uniqueIds = [];

            (Array.isArray(ids) ? ids : []).forEach(id => {
                if (availableIds.includes(id) && !uniqueIds.includes(id)) {
                    uniqueIds.push(id);
                }
            });

            availableIds.forEach(id => {
                if (!uniqueIds.includes(id) && uniqueIds.length < 4) {
                    uniqueIds.push(id);
                }
            });

            return uniqueIds.slice(0, Math.min(6, availableIds.length));
        };

        const loadDashboardKpiLayout = () => {
            if (typeof window === 'undefined') return DEFAULT_DASHBOARD_KPI_IDS;

            try {
                const storedValue = window.localStorage.getItem(DASHBOARD_KPI_STORAGE_KEY);
                if (!storedValue) return DEFAULT_DASHBOARD_KPI_IDS;

                const parsedValue = JSON.parse(storedValue);
                const candidateIds = Array.isArray(parsedValue) ? parsedValue : parsedValue?.visibleIds;
                return sanitizeDashboardKpiIds(candidateIds);
            } catch (error) {
                return DEFAULT_DASHBOARD_KPI_IDS;
            }
        };

        const persistDashboardKpiLayout = (visibleIds) => {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(DASHBOARD_KPI_STORAGE_KEY, JSON.stringify({ visibleIds }));
        };

        const moveDashboardKpiId = (ids, fromIndex, toIndex) => {
            if (toIndex < 0 || toIndex >= ids.length || fromIndex === toIndex) return ids;
            const reorderedIds = [...ids];
            const [movedId] = reorderedIds.splice(fromIndex, 1);
            reorderedIds.splice(toIndex, 0, movedId);
            return reorderedIds;
        };

        const formatDashboardShortName = (fullName) => {
            const [firstName = '', lastName = ''] = fullName.split(' ');
            return lastName ? `${firstName} ${lastName.charAt(0)}.` : fullName;
        };

        const filterDashboardInquiries = (inquiries, filters) => {
            return inquiries.filter(item => {
                if (filters.category !== 'all' && item.assignee !== filters.category) return false;
                if (filters.dateFrom && item.date < filters.dateFrom) return false;
                if (filters.dateTo && item.date > filters.dateTo) return false;
                return true;
            });
        };

        const groupDashboardInquiries = (inquiries, grouping) => {
            const groups = new Map();

            inquiries.forEach(item => {
                const date = parseDashboardDate(item.date);
                let label = '';
                let sortKey = item.date;

                if (grouping === 'daily') {
                    label = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
                } else if (grouping === 'weekly') {
                    const firstDay = new Date(date.getFullYear(), 0, 1);
                    const week = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
                    label = `שבוע ${week}`;
                    sortKey = `${date.getFullYear()}-${dashboardPad(week)}`;
                } else {
                    label = date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
                    sortKey = `${date.getFullYear()}-${dashboardPad(date.getMonth() + 1)}`;
                }

                if (!groups.has(label)) {
                    groups.set(label, { label, total: 0, items: [], sortKey });
                }

                const group = groups.get(label);
                group.total += 1;
                group.items.push(item);
            });

            return Array.from(groups.values());
        };

        const sortDashboardGroups = (groups, sortOrder) => {
            return [...groups].sort((a, b) => {
                const totalSort = sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
                return totalSort || a.sortKey.localeCompare(b.sortKey);
            });
        };

        const exportDashboardCsv = (groups) => {
            const headers = ['קבוצה', 'סה״כ בקבוצה', 'מספר פנייה', 'תאריך', 'גורם מטפל', 'דחיפות', 'סטטוס', 'טלפון', 'שם הפונה', 'מיקום', 'נושא'];
            const rows = groups.flatMap(group => group.items.map(item => [
                group.label,
                group.total,
                item.id,
                item.date,
                item.assignee,
                item.priority,
                item.status === 'open' ? 'פתוחה' : 'סגורה',
                item.phone,
                item.requester,
                item.location,
                item.subject
            ]));

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ייצוא_פניות_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };

export {
    dashboardDeterministicRandom,
    dashboardPad,
    parseDashboardDate,
    formatDashboardDate,
    generateDashboardMockData,
    sanitizeDashboardKpiIds,
    loadDashboardKpiLayout,
    persistDashboardKpiLayout,
    moveDashboardKpiId,
    formatDashboardShortName,
    filterDashboardInquiries,
    groupDashboardInquiries,
    sortDashboardGroups,
    exportDashboardCsv
};
