import { generateDashboardMockData } from '../utils/dashboard.utils.js';

export const dashboardPriorities = [
    { label: 'גבוהה-1', color: 'red', icon: 'target', chartColor: '#F94144', priorityLevel: 1 },
    { label: 'בינונית-2', color: 'amber', icon: 'clock', chartColor: '#F59E0B', priorityLevel: 2 },
    { label: 'נמוכה-3', color: 'pink', icon: 'check', chartColor: '#EC4899', priorityLevel: 3 }
];
export const dashboardAssignees = ['מנדיי', 'משה כהן', 'לא משויך'];
export const dashboardInquiries = generateDashboardMockData();

