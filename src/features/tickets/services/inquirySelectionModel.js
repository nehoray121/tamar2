export const inquirySelectionModel = {
    unique(ids) {
        return [...new Set((ids || []).filter(Boolean))];
    },

    prune(selectedIds, validIds) {
        const valid = new Set(validIds || []);
        return this.unique(selectedIds).filter((id) => valid.has(id));
    },

    includesAll(selectedIds, matchingIds) {
        if (!matchingIds?.length) return false;
        const selected = new Set(selectedIds || []);
        return matchingIds.every((id) => selected.has(id));
    }
};