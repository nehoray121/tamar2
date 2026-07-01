import { mockUserDirectory } from '../data/mockUserDirectory.js';
import { initialManagedUsers } from '../data/mockUserManagementData.js';

// Temporary frontend adapter. Replace these async functions with real user-management APIs later.
let users = initialManagedUsers.map((user) => ({ ...user, assignments: [...user.assignments], history: [...user.history] }));
let listeners = new Set();

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (user) => ({ ...user, assignments: [...user.assignments], history: [...user.history] });
const snapshot = () => users.map(clone);
const notify = () => listeners.forEach((listener) => listener(snapshot()));
const addHistory = (user, text) => ({ ...user, history: [{ id: `h-${Date.now()}`, text, time: new Date().toLocaleString('he-IL') }, ...user.history] });

export const userManagementService = {
    subscribe(listener) {
        listeners.add(listener);
        listener(snapshot());
        return () => listeners.delete(listener);
    },
    async searchDirectory(id) {
        await wait(80);
        return mockUserDirectory[id] || null;
    },
    async createManagedUser(payload) {
        await wait();
        const directoryUser = mockUserDirectory[payload.id];
        const user = {
            id: payload.id,
            name: directoryUser?.name || 'משתמש חדש',
            status: 'active',
            primaryRole: payload.role,
            primaryScope: payload.scope,
            assignments: [],
            history: [{ id: `h-${Date.now()}`, text: 'משתמש נוצר בפרוטוטייפ', time: new Date().toLocaleString('he-IL') }]
        };
        users = [user, ...users.filter((item) => item.id !== user.id)];
        notify();
        return clone(user);
    },
    async updatePrimary(userId, payload) {
        await wait();
        users = users.map((user) => user.id === userId ? addHistory({ ...user, primaryRole: payload.role, primaryScope: payload.scope }, 'עודכנה דרגה ראשית') : user);
        notify();
        return clone(users.find((user) => user.id === userId));
    },
    async addManagementAssignment(userId, payload) {
        await wait();
        users = users.map((user) => user.id === userId ? addHistory({ ...user, assignments: [...user.assignments, { id: `a-${Date.now()}`, ...payload }] }, 'נוסף שיוך ניהולי') : user);
        notify();
    },
    async updateManagementAssignment(userId, assignmentId, payload) {
        await wait();
        users = users.map((user) => user.id === userId ? addHistory({ ...user, assignments: user.assignments.map((assignment) => assignment.id === assignmentId ? { ...assignment, ...payload } : assignment) }, 'עודכן שיוך ניהולי') : user);
        notify();
    },
    async removeManagementAssignment(userId, assignmentId) {
        await wait();
        users = users.map((user) => user.id === userId ? addHistory({ ...user, assignments: user.assignments.filter((assignment) => assignment.id !== assignmentId) }, 'הוסר שיוך ניהולי') : user);
        notify();
    },
    async setUserActive(userId, active) {
        await wait();
        users = users.map((user) => user.id === userId ? addHistory({ ...user, status: active ? 'active' : 'inactive' }, active ? 'המשתמש הופעל' : 'המשתמש הושבת') : user);
        notify();
    }
};
