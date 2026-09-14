const ticketCapabilitiesByView = {
    open: {
        canView: true,
        canEdit: true,
        canChat: true,
        canSend: true,
        canClose: true,
        canReopen: false
    },
    my_tasks: {
        canView: true,
        canEdit: true,
        canChat: true,
        canSend: true,
        canClose: true,
        canReopen: false
    },
    history: {
        canView: true,
        canEdit: false,
        canChat: true,
        canSend: false,
        canClose: false,
        canReopen: true
    },
    external: {
        canView: true,
        canEdit: true,
        canChat: true,
        canSend: false,
        canClose: false,
        canReopen: false
    },
    default: {
        canView: true,
        canEdit: false,
        canChat: true,
        canSend: false,
        canClose: false,
        canReopen: false
    }
};

const getTicketCapabilities = (viewType = 'default') => (
    ticketCapabilitiesByView[viewType]
    ?? ticketCapabilitiesByView.default
);

const getTicketModalTabs = (viewType = 'default') => {
    const capabilities = getTicketCapabilities(viewType);
    const tabs = [
        { id: 'info', label: 'הפנייה הנוכחית' },
        { id: 'history', label: 'היסטוריית שינויים' }
    ];

    if (capabilities.canSend) {
        tabs.push({ id: 'send', label: 'שליחת פנייה' });
    }

    return tabs;
};

export { getTicketCapabilities, getTicketModalTabs };
