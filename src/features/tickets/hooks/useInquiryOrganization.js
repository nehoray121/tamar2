import { useEffect, useMemo, useState } from 'react';
import { inquiryOrganizationService } from '../services/inquiryOrganizationService.js';

const orderTickets = (tickets, selectedCategoryId, manualMode, manualOrders) => {
    const filtered = tickets.filter((ticket) => {
        if (selectedCategoryId === 'all') return true;
        return ticket.categoryId === selectedCategoryId;
    });

    if (manualMode && selectedCategoryId !== 'all' && manualOrders[selectedCategoryId]) {
        const orderMap = new Map(manualOrders[selectedCategoryId].map((id, index) => [id, index]));
        return [...filtered].sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999) || a.originalIndex - b.originalIndex);
    }

    return [...filtered].sort((a, b) => {
        if (a.pinned && b.pinned) return (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0);
        if (a.pinned) return -1;
        if (b.pinned) return 1;
        return a.originalIndex - b.originalIndex;
    });
};

export const useInquiryOrganization = ({ viewType = 'open', toggleState = 'received' } = {}) => {
    const [state, setState] = useState({ tickets: [], categories: [], manualOrders: {} });
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [manualMode, setManualMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [loadingIds, setLoadingIds] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => inquiryOrganizationService.subscribe(setState), []);

    const baseTickets = useMemo(() => {
        if (viewType === 'history') return state.tickets.filter((ticket) => ticket.status === 'closed');
        if (viewType === 'external') return state.tickets.filter((ticket) => ticket.status === (toggleState === 'sent' ? 'closed' : 'open')).slice(0, toggleState === 'sent' ? 3 : 4);
        return state.tickets.filter((ticket) => ticket.status === 'open');
    }, [state.tickets, toggleState, viewType]);

    const categoryCounts = useMemo(() => {
        const counts = { all: baseTickets.length };
        baseTickets.forEach((ticket) => {
            if (ticket.categoryId) counts[ticket.categoryId] = (counts[ticket.categoryId] ?? 0) + 1;
        });
        return counts;
    }, [baseTickets]);

    const tickets = useMemo(() => orderTickets(baseTickets, selectedCategoryId, manualMode, state.manualOrders), [baseTickets, manualMode, selectedCategoryId, state.manualOrders]);

    const runAction = async (ids, action) => {
        const idList = Array.isArray(ids) ? ids : [ids];
        setError('');
        setLoadingIds((current) => [...new Set([...current, ...idList])]);
        try {
            await action();
        } catch (err) {
            setError(err.message || 'הפעולה נכשלה');
        } finally {
            setLoadingIds((current) => current.filter((id) => !idList.includes(id)));
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const clearSelection = () => {
        setSelectedIds([]);
        setSelectionMode(false);
    };

    const saveManualOrder = (orderedIds) => runAction(orderedIds, () => inquiryOrganizationService.saveManualOrder(selectedCategoryId, orderedIds));

    return {
        tickets,
        categories: state.categories,
        categoryCounts,
        selectedCategoryId,
        setSelectedCategoryId,
        manualMode,
        setManualMode,
        selectionMode,
        setSelectionMode,
        selectedIds,
        setSelectedIds,
        toggleSelection,
        clearSelection,
        loadingIds,
        error,
        togglePin: (id) => runAction(id, () => inquiryOrganizationService.toggleInquiryPin(id)),
        createCategory: (payload) => inquiryOrganizationService.createCategory(payload),
        renameCategory: (id, payload) => inquiryOrganizationService.renameCategory(id, payload),
        deleteCategory: (id) => inquiryOrganizationService.deleteCategory(id),
        assignCategory: (inquiryId, categoryId) => runAction(inquiryId, () => inquiryOrganizationService.assignInquiryCategory(inquiryId, categoryId)),
        assignManyCategory: (categoryId) => runAction(selectedIds, () => inquiryOrganizationService.assignManyInquiryCategory(selectedIds, categoryId)),
        setManyPinned: (pinned) => runAction(selectedIds, () => inquiryOrganizationService.setManyPinned(selectedIds, pinned)),
        saveManualOrder
    };
};
