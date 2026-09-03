const DASHBOARD_LIST_TARGET_KEY = 'tamar:dashboard-list-target:v1';
const DASHBOARD_LIST_TARGET_TTL_MS = 5 * 60 * 1000;

const INQUIRY_KPI_IDS = new Set([
    'open',
    'overdue',
    'urgent',
    'unassigned',
    'recentlyHandled',
    'total',
    'closed',
    'openedToday',
    'assignedOpen'
]);

const normalizeText = (value) => String(value ?? '')
    .trim()
    .replace(/\s+/gu, ' ');

const normalizeComparableText = (value) => normalizeText(value)
    .toLocaleLowerCase('he-IL');

const asDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value).trim();
    if (!text) return null;

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text);
    const parsed = dateOnlyMatch
        ? new Date(
            Number(dateOnlyMatch[1]),
            Number(dateOnlyMatch[2]) - 1,
            Number(dateOnlyMatch[3]),
            12,
            0,
            0,
            0
        )
        : new Date(text);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const firstDate = (...values) => {
    for (const value of values) {
        const date = asDate(value);
        if (date) return date;
    }
    return null;
};

const sameLocalDay = (left, right) => Boolean(
    left
    && right
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
);

const isOpenInquiry = (item) => {
    const status = normalizeComparableText(
        item?.status
        || item?.state
        || item?.ticketStatus
    );

    if (
        status.includes('closed')
        || status.includes('resolved')
        || status.includes('done')
        || status.includes('סגור')
        || status.includes('נסגר')
    ) {
        return false;
    }

    if (
        status.includes('open')
        || status.includes('pending')
        || status.includes('in_progress')
        || status.includes('פתוח')
        || status.includes('בטיפול')
    ) {
        return true;
    }

    return !firstDate(
        item?.closedAt,
        item?.closingDate,
        item?.resolvedAt
    );
};

const isClosedInquiry = (item) => !isOpenInquiry(item);

// Dashboard business rule:
// "urgent / important / immediate attention" means ONLY:
//   level 1 = high
//   level 2 = medium
// Level 3 = low and must never be counted as urgent.
export const isDashboardUrgentInquiry = (item) => {
    const priority = normalizeComparableText(
        item?.priority
        || item?.priorityLabel
        || item?.urgency
    );

    if (
        priority.includes('low')
        || priority.includes('נמוך')
        || priority.includes('נמוכה')
        || /(?:^|\D)3(?:\D|$)/u.test(priority)
    ) {
        return false;
    }

    if (
        priority.includes('critical')
        || priority.includes('high')
        || priority.includes('medium')
        || priority.includes('קריט')
        || priority.includes('גבוה')
        || priority.includes('בינונ')
        || /(?:^|\D)[12](?:\D|$)/u.test(priority)
    ) {
        return true;
    }

    const numericLevel = Number(
        item?.priorityLevel
        ?? item?.priorityOrder
        ?? Number.NaN
    );

    return (
        Number.isFinite(numericLevel)
        && numericLevel >= 1
        && numericLevel <= 2
    );
};

const getAssigneeLabel = (item) => {
    const assignee = item?.assignee;

    if (assignee && typeof assignee === 'object') {
        return normalizeText(
            assignee.displayName
            || assignee.fullName
            || assignee.name
            || assignee.email
            || assignee.id
        );
    }

    return normalizeText(
        item?.assigneeLabel
        || item?.assigneeName
        || item?.handler
        || assignee
    );
};

const getAssigneeId = (item) => {
    const assignee = item?.assignee;

    return normalizeComparableText(
        item?.assigneeId
        || item?.assignedUserId
        || item?.handlerId
        || item?.userId
        || (assignee && typeof assignee === 'object'
            ? assignee.id || assignee.userId || assignee.email
            : '')
    );
};

const namesRepresentSamePerson = (leftValue, rightValue) => {
    const left = normalizeComparableText(leftValue);
    const right = normalizeComparableText(rightValue);

    if (!left || !right) return false;
    if (left === right) return true;

    const parts = (value) => value
        .replace(/[.،,]/gu, ' ')
        .split(/\s+/u)
        .filter(Boolean);

    const leftParts = parts(left);
    const rightParts = parts(right);

    if (!leftParts.length || !rightParts.length) return false;
    if (leftParts[0] !== rightParts[0]) return false;

    const leftLast = leftParts.at(-1) || '';
    const rightLast = rightParts.at(-1) || '';

    return Boolean(
        leftLast
        && rightLast
        && leftLast.charAt(0) === rightLast.charAt(0)
    );
};

const isUnassignedLabel = (value) => {
    const label = normalizeComparableText(value);

    return !label
        || label === '-'
        || label === '—'
        || label === 'none'
        || label === 'null'
        || label.includes('לא משויך')
        || label.includes('ללא שיוך')
        || label.includes('ללא מטפל')
        || label.includes('ללא גורם');
};

const isAssignedInquiry = (item) => !isUnassignedLabel(
    getAssigneeLabel(item)
);

const getCreatedDate = (item) => firstDate(
    item?.createdAt,
    item?.openedAt,
    item?.openDate,
    item?.date
);

const getClosedDate = (item) => firstDate(
    item?.closedAt,
    item?.closingDate,
    item?.resolvedAt,
    item?.handledAt,
    item?.updatedAt,
    item?.date
);

const isOverdueInquiry = (item, now) => {
    if (item?.isOverdue === true || item?.overdue === true) return true;
    if (!isOpenInquiry(item)) return false;

    const createdAt = getCreatedDate(item);
    if (!createdAt) return false;

    return now.getTime() - createdAt.getTime() >= 48 * 60 * 60 * 1000;
};

const isRecentlyHandledInquiry = (item, now) => {
    if (item?.recentlyHandled === true || item?.handledRecently === true) {
        return true;
    }

    if (!isClosedInquiry(item)) return false;

    const closedAt = getClosedDate(item);
    if (!closedAt) return false;

    const age = now.getTime() - closedAt.getTime();
    return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
};

const getInquiryNumber = (item) => normalizeText(
    item?.ticketNumber
    || item?.displayId
    || item?.inquiryNumber
    || item?.taskNumber
    || item?.id
);

const sortDashboardItems = (items) => [...items].sort((left, right) => {
    const urgentOrder = Number(isDashboardUrgentInquiry(right))
        - Number(isDashboardUrgentInquiry(left));

    if (urgentOrder) return urgentOrder;

    const rightDate = getCreatedDate(right)?.getTime() || 0;
    const leftDate = getCreatedDate(left)?.getTime() || 0;

    return rightDate - leftDate;
});

export const isDashboardInquiryKpi = (kpiId) => (
    INQUIRY_KPI_IDS.has(kpiId)
);

export const filterDashboardInquiriesForKpi = (
    kpiId,
    inquiries = [],
    nowValue = new Date()
) => {
    const source = Array.isArray(inquiries) ? inquiries : [];
    const now = asDate(nowValue) || new Date();

    const predicate = {
        total: () => true,
        open: (item) => isOpenInquiry(item),
        closed: (item) => isClosedInquiry(item),
        overdue: (item) => isOverdueInquiry(item, now),
        urgent: (item) => isOpenInquiry(item) && isDashboardUrgentInquiry(item),
        unassigned: (item) => isOpenInquiry(item) && !isAssignedInquiry(item),
        assignedOpen: (item) => isOpenInquiry(item) && isAssignedInquiry(item),
        openedToday: (item) => sameLocalDay(getCreatedDate(item), now),
        recentlyHandled: (item) => isRecentlyHandledInquiry(item, now)
    }[kpiId];

    if (!predicate) return [];
    return sortDashboardItems(source.filter(predicate));
};

export const buildDashboardWorkloadPeople = (
    workloadRows = [],
    inquiries = []
) => {
    const assignedItems = (Array.isArray(inquiries) ? inquiries : [])
        .filter(isAssignedInquiry);

    const people = [];
    const seenIdentityKeys = new Set();

    const identityKeysForRow = (row, fallbackName) => {
        const rowId = normalizeComparableText(
            row?.id
            || row?.userId
            || row?.personId
            || row?.assigneeId
            || row?.email
        );
        const rowName = normalizeComparableText(fallbackName);

        return [
            rowId ? `id:${rowId}` : '',
            rowName ? `name:${rowName}` : ''
        ].filter(Boolean);
    };

    const itemMatchesKeys = (item, identityKeys) => {
        const itemId = getAssigneeId(item);
        const itemName = normalizeComparableText(getAssigneeLabel(item));

        return identityKeys.some((key) => {
            if (itemId && key === `id:${itemId}`) return true;
            if (itemName && key === `name:${itemName}`) return true;

            return key.startsWith('name:')
                && namesRepresentSamePerson(itemName, key.slice(5));
        });
    };

    (Array.isArray(workloadRows) ? workloadRows : []).forEach((row, index) => {
        const name = normalizeText(
            row?.name
            || row?.displayName
            || row?.fullName
            || row?.assignee
            || row?.email
            || `נציג ${index + 1}`
        );
        const identityKeys = identityKeysForRow(row, name);
        const tasks = sortDashboardItems(
            assignedItems.filter((item) => itemMatchesKeys(item, identityKeys))
        );
        const explicitTotal = Number(row?.total);

        identityKeys.forEach((key) => seenIdentityKeys.add(key));

        people.push({
            id: normalizeText(
                row?.id
                || row?.userId
                || row?.personId
                || row?.assigneeId
            ) || identityKeys[0] || `person-${index}`,
            name,
            total: Number.isFinite(explicitTotal)
                ? Math.max(0, explicitTotal)
                : tasks.length,
            urgent: tasks.filter(isDashboardUrgentInquiry).length,
            tasks
        });
    });

    const missingPeople = new Map();

    assignedItems.forEach((item) => {
        const name = getAssigneeLabel(item);
        const itemId = getAssigneeId(item);
        const nameKey = normalizeComparableText(name);
        const identityKey = itemId ? `id:${itemId}` : `name:${nameKey}`;
        const alternateNameKey = nameKey ? `name:${nameKey}` : '';

        if (
            seenIdentityKeys.has(identityKey)
            || (alternateNameKey && seenIdentityKeys.has(alternateNameKey))
        ) {
            return;
        }

        const current = missingPeople.get(identityKey) || {
            id: itemId || nameKey,
            name,
            tasks: []
        };

        current.tasks.push(item);
        missingPeople.set(identityKey, current);
    });

    missingPeople.forEach((person) => {
        const tasks = sortDashboardItems(person.tasks);

        people.push({
            ...person,
            total: tasks.length,
            urgent: tasks.filter(isDashboardUrgentInquiry).length,
            tasks
        });
    });

    return people;
};

const resolveExplicitView = (item) => {
    const hint = normalizeComparableText(
        item?.destinationView
        || item?.listView
        || item?.viewType
        || item?.page
    );

    if (hint.includes('external') || hint.includes('חיצונ')) {
        return { viewId: 'external', viewType: 'external' };
    }

    if (hint.includes('history') || hint.includes('closed') || hint.includes('היסטור')) {
        return { viewId: 'history', viewType: 'history' };
    }

    if (hint.includes('my_tasks') || hint.includes('my tasks')) {
        return { viewId: 'my_tasks', viewType: 'my_tasks' };
    }

    if (hint.includes('open') || hint.includes('פתוח')) {
        return { viewId: 'open_complaints', viewType: 'open' };
    }

    return null;
};

const resolveExternalToggle = (item) => {
    const hint = normalizeComparableText([
        item?.boardType,
        item?.sourceBoardType,
        item?.externalDirection,
        item?.direction,
        item?.transferDirection,
        item?.externalState
    ].filter(Boolean).join(' '));

    return (
        hint.includes('sent')
        || hint.includes('outgoing')
        || hint.includes('transferred_out')
        || hint.includes('נשלח')
        || hint.includes('יוצא')
    )
        ? 'sent'
        : 'received';
};

const isExternalInquiry = (item) => {
    if (item?.isExternal === true || item?.external === true) return true;

    const hint = normalizeComparableText([
        item?.boardType,
        item?.sourceBoardType,
        item?.externalDirection,
        item?.direction,
        item?.transferId
    ].filter(Boolean).join(' '));

    return hint.includes('external') || hint.includes('חיצונ');
};

export const resolveDashboardListTarget = (item) => {
    const search = getInquiryNumber(item);
    if (!search) return null;

    const explicitView = resolveExplicitView(item);
    let destination = explicitView;

    if (!destination && isExternalInquiry(item)) {
        destination = { viewId: 'external', viewType: 'external' };
    }

    if (!destination) {
        destination = isClosedInquiry(item)
            ? { viewId: 'history', viewType: 'history' }
            : { viewId: 'open_complaints', viewType: 'open' };
    }

    return {
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        search,
        viewId: destination.viewId,
        viewType: destination.viewType,
        toggleState: destination.viewType === 'external'
            ? resolveExternalToggle(item)
            : undefined
    };
};

export const queueDashboardListTarget = (item) => {
    const target = resolveDashboardListTarget(item);
    if (!target) return null;

    if (
        typeof window !== 'undefined'
        && window.sessionStorage
    ) {
        window.sessionStorage.setItem(
            DASHBOARD_LIST_TARGET_KEY,
            JSON.stringify(target)
        );
    }

    return target;
};

const parseStoredTarget = () => {
    if (
        typeof window === 'undefined'
        || !window.sessionStorage
    ) {
        return null;
    }

    try {
        const parsed = JSON.parse(
            window.sessionStorage.getItem(DASHBOARD_LIST_TARGET_KEY)
            || 'null'
        );

        if (!parsed || typeof parsed !== 'object') return null;

        if (
            !Number.isFinite(Number(parsed.createdAt))
            || Date.now() - Number(parsed.createdAt) > DASHBOARD_LIST_TARGET_TTL_MS
        ) {
            window.sessionStorage.removeItem(DASHBOARD_LIST_TARGET_KEY);
            return null;
        }

        return parsed;
    }
    catch {
        window.sessionStorage.removeItem(DASHBOARD_LIST_TARGET_KEY);
        return null;
    }
};

export const readDashboardListTarget = (viewType) => {
    const target = parseStoredTarget();
    if (!target) return null;

    return target.viewType === viewType ? target : null;
};

export const clearDashboardListTarget = (requestId) => {
    const target = parseStoredTarget();
    if (!target) return;

    if (!requestId || target.requestId === requestId) {
        window.sessionStorage.removeItem(DASHBOARD_LIST_TARGET_KEY);
    }
};
