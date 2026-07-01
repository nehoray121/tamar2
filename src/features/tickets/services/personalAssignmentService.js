import { mockRoomUsers } from '../data/mockRoomUsers.js';

// Temporary frontend adapter. Replace with real room-user and assignment APIs later.
let assignments = {};

const wait = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

export const personalAssignmentService = {
    async getEligibleRoomUsers(roomId) {
        await wait();
        return mockRoomUsers.filter((user) => user.roomId === roomId && !user.manager);
    },

    async getAssignment(inquiryId) {
        await wait(40);
        return assignments[inquiryId] || null;
    },

    async assignInquiryToUser(inquiryId, userId) {
        await wait();
        const user = mockRoomUsers.find((item) => item.id === userId);
        assignments = { ...assignments, [inquiryId]: user || null };
        return assignments[inquiryId];
    },

    async clearAssignment(inquiryId) {
        await wait();
        assignments = { ...assignments, [inquiryId]: null };
        return null;
    }
};
