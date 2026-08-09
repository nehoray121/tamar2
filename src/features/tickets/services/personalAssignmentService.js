import { ticketsApi } from '../api/ticketsApi.js';
import { roleLabels } from '../../users/constants/userRoles.js';

const adaptUser = (user) => ({
    id: String(user.id),
    name: user.displayName || 'משתמש ללא שם',
    role: roleLabels[user.eligibleRoomRole] || user.eligibleRoomRole || 'משתמש בחדר',
    personalId: user.email || 'מזהה ארגוני'
});

const adaptAssignment = (ticket) => ({
    inquiryId: String(ticket.id),
    assignedUserIds: (ticket.activeAssigneeIds || []).map(String),
    assignedUsers: (ticket.activeAssignees || []).map(adaptUser),
    version: Number(ticket.version) || 0,
    updatedAt: ticket.updatedAt || null
});

export const personalAssignmentService = {
    async getEligibleRoomUsers(inquiryId) {
        const response = await ticketsApi.getAssignableUsers(inquiryId, { page: 1, limit: 100, includeAssigned: true });
        return (response.data?.items || []).map(adaptUser);
    },
    async getAssignment(inquiryId) {
        const response = await ticketsApi.get(inquiryId);
        return adaptAssignment(response.data);
    },
    async saveAssignment(inquiryId, userIds) {
        const current = await ticketsApi.get(inquiryId);
        const response = await ticketsApi.replaceAssignees(inquiryId, [...new Set(userIds.map(String))], current.data.version);
        return adaptAssignment(response.data);
    },
    async clearAssignment(inquiryId) {
        return this.saveAssignment(inquiryId, []);
    }
};