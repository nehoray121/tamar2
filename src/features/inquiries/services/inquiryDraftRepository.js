export const INQUIRY_DRAFT_SCHEMA_VERSION = 1;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const buildInquiryDraftKey = ({ userId, environmentId, subEnvironmentId, roomId }) => (
    `tamar:new-inquiry-draft:${userId || 'anonymous'}:${environmentId || 'none'}:${subEnvironmentId || 'none'}:${roomId || 'none'}`
);

const normalizeDraft = (value) => {
    if (!value || value.schemaVersion !== INQUIRY_DRAFT_SCHEMA_VERSION || !value.payload) return null;
    return value;
};

export const inquiryDraftRepository = {
    async load(key) {
        if (!canUseStorage()) return null;
        try {
            const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
            return normalizeDraft(parsed);
        } catch {
            return null;
        }
    },

    async save(key, payload, updatedAt = Date.now()) {
        if (!canUseStorage()) return;
        const current = await this.load(key);
        if (current?.updatedAt && current.updatedAt > updatedAt) return;

        window.localStorage.setItem(key, JSON.stringify({
            schemaVersion: INQUIRY_DRAFT_SCHEMA_VERSION,
            updatedAt,
            payload
        }));
    },

    async clear(key) {
        if (!canUseStorage()) return;
        window.localStorage.removeItem(key);
    }
};
