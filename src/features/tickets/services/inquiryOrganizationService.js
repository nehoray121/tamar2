import { initialInquiryCategories, initialTickets } from '../data/mockInquiryOrganizationData.js';

// Temporary frontend adapter. Replace these async functions with real backend API calls later.
let tickets = initialTickets.map((ticket) => ({ ...ticket }));
let categories = initialInquiryCategories.map((category) => ({ ...category }));
let manualOrders = {};
let listeners = new Set();

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const snapshot = () => ({
    tickets: tickets.map((ticket) => ({ ...ticket })),
    categories: categories.map((category) => ({ ...category })),
    manualOrders: { ...manualOrders }
});

const notify = () => {
    const current = snapshot();
    listeners.forEach((listener) => listener(current));
};

export const inquiryOrganizationService = {
    subscribe(listener) {
        listeners.add(listener);
        listener(snapshot());
        return () => listeners.delete(listener);
    },

    async getState() {
        await wait(40);
        return snapshot();
    },

    async getCategories() {
        await wait(40);
        return snapshot().categories;
    },

    async createCategory(payload) {
        await wait();
        const category = {
            id: `category-${Date.now()}`,
            name: payload.name?.trim() || 'קטגוריה חדשה',
            color: payload.color || '#3B82F6'
        };
        categories = [...categories, category];
        notify();
        return category;
    },

    async renameCategory(id, payload) {
        await wait();
        categories = categories.map((category) => category.id === id ? { ...category, name: payload.name?.trim() || category.name, color: payload.color || category.color } : category);
        notify();
        return categories.find((category) => category.id === id);
    },

    async deleteCategory(id) {
        await wait();
        categories = categories.filter((category) => category.id !== id || category.system);
        tickets = tickets.map((ticket) => ticket.categoryId === id ? { ...ticket, categoryId: null } : ticket);
        delete manualOrders[id];
        notify();
    },

    async assignInquiryCategory(inquiryId, categoryId) {
        await wait();
        tickets = tickets.map((ticket) => ticket.id === inquiryId ? { ...ticket, categoryId: categoryId === 'all' ? null : categoryId } : ticket);
        notify();
    },

    async assignManyInquiryCategory(inquiryIds, categoryId) {
        await wait();
        tickets = tickets.map((ticket) => inquiryIds.includes(ticket.id) ? { ...ticket, categoryId: categoryId === 'all' ? null : categoryId } : ticket);
        notify();
    },

    async toggleInquiryPin(inquiryId) {
        await wait();
        tickets = tickets.map((ticket) => {
            if (ticket.id !== inquiryId) return ticket;
            return ticket.pinned ? { ...ticket, pinned: false, pinnedAt: undefined } : { ...ticket, pinned: true, pinnedAt: Date.now() };
        });
        notify();
    },

    async setManyPinned(inquiryIds, pinned) {
        await wait();
        const pinnedAt = Date.now();
        tickets = tickets.map((ticket, index) => inquiryIds.includes(ticket.id) ? { ...ticket, pinned, pinnedAt: pinned ? pinnedAt + index : undefined } : ticket);
        notify();
    },

    async saveManualOrder(categoryId, orderedIds) {
        await wait();
        manualOrders = { ...manualOrders, [categoryId]: orderedIds };
        notify();
        return orderedIds;
    },

    async closeInquiry(inquiryId, payload) {
        await wait(300);
        if (!payload?.summary?.trim()) {
            throw new Error('נדרש למלא סיכום טיפול');
        }
        tickets = tickets.map((ticket) => ticket.id === inquiryId ? {
            ...ticket,
            status: 'closed',
            closeDate: new Date().toLocaleDateString('he-IL'),
            closureSummary: payload.summary.trim(),
            pinned: false,
            pinnedAt: undefined
        } : ticket);
        notify();
        return tickets.find((ticket) => ticket.id === inquiryId);
    }
};
