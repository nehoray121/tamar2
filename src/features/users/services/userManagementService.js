import { usersApi } from '../api/usersApi.js';

const adaptMembership = (membership) => ({ ...membership, scope: membership });

const adaptUser = (user) => ({
    ...user,
    name: user.displayName,
    status: user.isActive ? 'active' : 'inactive',
    primaryScope: user.primaryScope ? adaptMembership(user.primaryScope) : null,
    assignments: (user.assignments || []).map(adaptMembership),
    history: (user.history || []).map((item) => ({
        ...item,
        time: item.time ? new Date(item.time).toLocaleString('he-IL') : ''
    }))
});

const adaptResponse = (response) => {
    if (response.data?.noLongerVisible) {
        return response;
    }

    return {
        ...response,
        data: adaptUser(response.data)
    };
};

export const userManagementService = {
    async list(params, options) {
        const response = await usersApi.list(params, options);
        return {
            ...response.data,
            items: (response.data?.items || []).map(adaptUser)
        };
    },

    async options(options) {
        return (await usersApi.options(options)).data;
    },

    async getManagedUser(userId, options) {
        return adaptResponse(await usersApi.get(userId, options)).data;
    },

    async createManagedUser(payload) {
        return adaptResponse(await usersApi.create(payload)).data;
    },

    async updateUser(user, updates) {
        return adaptResponse(
            await usersApi.update(user.id, updates, user.version)
        ).data;
    },

    async addManagementAssignment(userId, payload) {
        return adaptResponse(
            await usersApi.addMembership(userId, payload)
        ).data;
    },

    async removeManagementAssignment(userId, membershipId) {
        return adaptResponse(
            await usersApi.removeMembership(userId, membershipId)
        ).data;
    }
};
