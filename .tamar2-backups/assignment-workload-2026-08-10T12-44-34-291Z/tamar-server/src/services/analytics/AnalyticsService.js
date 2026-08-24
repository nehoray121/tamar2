const mongoose = require('mongoose');
const AppError = require('../../errors/AppError.js');
const Ticket = require('../../modules/tickets/models/Ticket.js');
const TicketHistory = require('../../modules/tickets/models/TicketHistory.js');
const User = require('../../models/User.js');
const OrganizationMembership = require('../../models/OrganizationMembership.js');
const System = require('../../models/System.js');
const Environment = require('../../models/Environment.js');
const SubEnvironment = require('../../models/SubEnvironment.js');
const Room = require('../../models/Room.js');
const { ROLES } = require('../../domain/access/constants.js');

const OVERDUE_HOURS = 48;
const RECENTLY_HANDLED_DAYS = 7;
const oid = (value) => new mongoose.Types.ObjectId(String(value));
const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const priorityLabels = Object.freeze({ CRITICAL: 'קריטית', HIGH: 'גבוהה', MEDIUM: 'בינונית', LOW: 'נמוכה' });
const priorityColors = Object.freeze({ CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#3B82F6', LOW: '#10B981' });
const uiPriorityLabels = Object.freeze({ CRITICAL: 'גבוהה-1', HIGH: 'גבוהה-1', MEDIUM: 'בינונית-2', LOW: 'נמוכה-3' });
const uiPriorityClasses = Object.freeze({ CRITICAL: 'bg-red-50 text-red-600', HIGH: 'bg-orange-50 text-orange-600', MEDIUM: 'bg-blue-50 text-blue-600', LOW: 'bg-emerald-50 text-emerald-600' });

const periodExpression = (grouping) => {
    if (grouping === 'daily') return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Jerusalem' } };
    if (grouping === 'weekly') return { $concat: [{ $toString: { $isoWeekYear: '$createdAt' } }, '-W', { $toString: { $isoWeek: '$createdAt' } }] };
    return { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Jerusalem' } };
};
const closedPeriodExpression = (grouping) => {
    const base = periodExpression(grouping);
    return JSON.parse(JSON.stringify(base).replaceAll('$createdAt', '$closedAt'));
};
const dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
const paginationDefaults = Object.freeze({ page: 1, limit: 25, totalItems: 0, totalPages: 0, hasNext: false, hasPrevious: false });

class AnalyticsService {
    constructor({ organization, scopeResolver, userManagementService }) {
        Object.assign(this, { organization, scopeResolver, userManagementService });
    }

    async resolveMatch(userId, query) {
        const access = await this.scopeResolver.resolveEffectiveAccess(userId);
        if (!access.isActive) throw new AppError({ statusCode: 403, code: 'ANALYTICS_FORBIDDEN', message: 'Analytics require an active organizational membership' });
        let lineage = null;
        if (query.roomId) lineage = await this.organization.integrityService.resolveRoom(query.roomId, {
            systemId: query.systemId, environmentId: query.environmentId, subEnvironmentId: query.subEnvironmentId, requireOperational: true
        });
        else if (query.subEnvironmentId) lineage = await this.organization.integrityService.resolveSubEnvironment(query.subEnvironmentId, {
            systemId: query.systemId, environmentId: query.environmentId, requireOperational: true
        });
        else if (query.environmentId) lineage = await this.organization.integrityService.resolveEnvironment(query.environmentId, {
            systemId: query.systemId, requireOperational: true
        });
        else if (query.systemId) lineage = await this.organization.integrityService.resolveSystem(query.systemId, { requireOperational: true });

        const requestedSystemId = lineage?.system?._id || query.systemId;
        if (requestedSystemId && !access.systemIds.some((id) => sameId(id, requestedSystemId))) {
            throw new AppError({ statusCode: 403, code: 'ANALYTICS_SCOPE_FORBIDDEN', message: 'Requested analytics scope is outside the authenticated authority' });
        }
        if (query.roomId && !access.global && !access.roomIds.some((id) => sameId(id, query.roomId))) {
            throw new AppError({ statusCode: 403, code: 'ANALYTICS_SCOPE_FORBIDDEN', message: 'Requested room is outside the authenticated authority' });
        }
        if (query.subEnvironmentId && !access.global && !access.subEnvironmentIds.some((id) => sameId(id, query.subEnvironmentId))) {
            throw new AppError({ statusCode: 403, code: 'ANALYTICS_SCOPE_FORBIDDEN', message: 'Requested sub-environment is outside the authenticated authority' });
        }
        if (query.environmentId && !access.global && !access.environmentIds.some((id) => sameId(id, query.environmentId))) {
            throw new AppError({ statusCode: 403, code: 'ANALYTICS_SCOPE_FORBIDDEN', message: 'Requested environment is outside the authenticated authority' });
        }

        const superSystems = access.memberships.filter((item) => item.role === ROLES.SUPER_ADMIN).map((item) => oid(item.systemId));
        const roomIds = access.roomIds.map(oid);
        const visibility = [];
        if (superSystems.length) visibility.push({ systemId: { $in: superSystems } });
        if (roomIds.length) visibility.push({ currentRoomId: { $in: roomIds } });
        const conditions = [{ $or: visibility.length ? visibility : [{ _id: null }] }];
        for (const field of ['systemId', 'environmentId', 'subEnvironmentId']) if (query[field]) conditions.push({ [field]: oid(query[field]) });
        if (query.roomId) conditions.push({ currentRoomId: oid(query.roomId) });
        if (query.assigneeId) conditions.push({ activeAssigneeIds: oid(query.assigneeId) });
        if (query.dateFrom || query.dateTo) conditions.push({ createdAt: {
            ...(query.dateFrom ? { $gte: query.dateFrom } : {}), ...(query.dateTo ? { $lte: query.dateTo } : {})
        } });
        return { access, match: { $and: conditions }, lineage };
    }

    async aggregate(userId, query = {}) {
        const now = new Date();
        const overdueBefore = new Date(now.getTime() - OVERDUE_HOURS * 60 * 60 * 1000);
        const recentSince = new Date(now.getTime() - RECENTLY_HANDLED_DAYS * 24 * 60 * 60 * 1000);
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const { match, access } = await this.resolveMatch(userId, query);
        const grouping = query.grouping || 'monthly';
        const summaryProjection = {
            _id: 1, ticketNumber: 1, subject: 1, description: 1, priority: 1, status: 1,
            currentRoomId: 1, createdBy: 1, activeAssigneeIds: 1, createdAt: 1, updatedAt: 1, closedAt: 1
        };
        const summaryShape = Object.fromEntries(
            Object.keys(summaryProjection).map((field) => [field, `$${field}`])
        );
        const [facet = {}] = await Ticket.aggregate([
            { $match: match },
            { $facet: {
                metrics: [{ $group: {
                    _id: null,
                    total: { $sum: 1 },
                    open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
                    closed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
                    overdue: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'OPEN'] }, { $lte: ['$createdAt', overdueBefore] }] }, 1, 0] } },
                    urgentOpen: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'OPEN'] }, { $in: ['$priority', ['HIGH', 'CRITICAL']] }] }, 1, 0] } },
                    unassigned: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'OPEN'] }, { $eq: [{ $size: '$activeAssigneeIds' }, 0] }] }, 1, 0] } },
                    recentlyHandled: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'CLOSED'] }, { $gte: ['$closedAt', recentSince] }] }, 1, 0] } },
                    openedToday: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] } },
                    averageHandlingMs: { $avg: { $cond: [{ $and: [{ $eq: ['$status', 'CLOSED'] }, { $ne: ['$closedAt', null] }] }, { $subtract: ['$closedAt', '$createdAt'] }, null] } }
                } }],
                trend: [
                    { $group: { _id: periodExpression(grouping), total: { $sum: 1 }, items: { $push: summaryShape } } },
                    { $sort: { _id: 1 } }
                ],
                openedTrend: [
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Jerusalem' } }, value: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                closedTrend: [
                    { $match: { status: 'CLOSED', closedAt: { $ne: null } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$closedAt', timezone: 'Asia/Jerusalem' } }, value: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                priorities: [{ $group: { _id: '$priority', value: { $sum: 1 } } }, { $sort: { value: -1, _id: 1 } }],
                workload: [
                    { $match: { status: 'OPEN' } }, { $unwind: '$activeAssigneeIds' },
                    { $group: { _id: '$activeAssigneeIds', total: { $sum: 1 }, urgent: { $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0] } } } },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' },
                    { $match: { 'user.isActive': true } },
                    { $project: { _id: 0, userId: { $toString: '$_id' }, name: '$user.displayName', total: 1, urgent: 1 } },
                    { $sort: { total: -1, name: 1 } }
                ],
                attention: [
                    { $match: { status: 'OPEN', $or: [
                        { priority: { $in: ['HIGH', 'CRITICAL'] } },
                        { createdAt: { $lte: overdueBefore } },
                        { activeAssigneeIds: { $size: 0 } }
                    ] } },
                    { $sort: { priority: 1, createdAt: 1 } }, { $limit: 10 }, { $project: summaryProjection }
                ],
                inquiries: [{ $sort: { createdAt: -1 } }, { $limit: 250 }, { $project: summaryProjection }],
                environmentLoad: [{ $match: { status: 'OPEN' } }, { $group: { _id: '$environmentId', value: { $sum: 1 } } }, { $sort: { value: -1 } }],
                subEnvironmentLoad: [{ $match: { status: 'OPEN' } }, { $group: { _id: '$subEnvironmentId', value: { $sum: 1 } } }, { $sort: { value: -1 } }],
                roomLoad: [{ $match: { status: 'OPEN' } }, { $group: { _id: '$currentRoomId', value: { $sum: 1 } } }, { $sort: { value: -1 } }]
            } }
        ]).exec();
        const metricsRow = facet.metrics?.[0] || {};
        const metrics = {
            total: metricsRow.total || 0, open: metricsRow.open || 0, closed: metricsRow.closed || 0,
            overdue: metricsRow.overdue || 0, urgentOpen: metricsRow.urgentOpen || 0,
            unassigned: metricsRow.unassigned || 0, recentlyHandled: metricsRow.recentlyHandled || 0,
            openedToday: metricsRow.openedToday || 0,
            averageHandlingHours: metricsRow.averageHandlingMs ? Number((metricsRow.averageHandlingMs / 3600000).toFixed(1)) : 0
        };
        const allSummaries = [...(facet.inquiries || []), ...(facet.attention || []), ...(facet.trend || []).flatMap((entry) => entry.items || [])];
        const userIds = [...new Set(allSummaries.flatMap((item) => [item.createdBy, ...(item.activeAssigneeIds || [])]).filter(Boolean).map(String))].map(oid);
        const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select('_id displayName').lean().exec() : [];
        const names = new Map(users.map((user) => [String(user._id), user.displayName]));
        const toInquiry = (ticket) => ({
            id: ticket.ticketNumber || String(ticket._id), ticketId: String(ticket._id),
            requester: names.get(String(ticket.createdBy)) || 'משתמש מערכת',
            assignee: names.get(String(ticket.activeAssigneeIds?.[0])) || 'לא משויך',
            priority: uiPriorityLabels[ticket.priority] || ticket.priority,
            priorityKey: ticket.priority, priorityLevel: ticket.priority === 'CRITICAL' ? 0 : ticket.priority === 'HIGH' ? 1 : ticket.priority === 'MEDIUM' ? 2 : 3,
            priorityColor: uiPriorityClasses[ticket.priority] || uiPriorityClasses.MEDIUM,
            chartColor: priorityColors[ticket.priority] || priorityColors.MEDIUM,
            date: dateLabel(ticket.createdAt), status: String(ticket.status || '').toLowerCase(),
            subject: ticket.subject, description: ticket.description, phone: 'לא זמין', location: '',
            currentRoomId: String(ticket.currentRoomId), createdAt: ticket.createdAt, closedAt: ticket.closedAt || null
        });
        const activityByDate = new Map();
        (facet.openedTrend || []).forEach((item) => activityByDate.set(item._id, { label: item._id, opened: item.value, closed: 0 }));
        (facet.closedTrend || []).forEach((item) => activityByDate.set(item._id, { ...(activityByDate.get(item._id) || { label: item._id, opened: 0 }), closed: item.value }));
        return {
            definitions: { overdueHours: OVERDUE_HOURS, recentlyHandledDays: RECENTLY_HANDLED_DAYS, urgentPriorities: ['HIGH', 'CRITICAL'] },
            metrics,
            trend: (facet.trend || []).map((entry) => ({ label: entry._id, sortKey: entry._id, total: entry.total, items: (entry.items || []).map(toInquiry) })),
            activityTrend: [...activityByDate.values()].sort((a, b) => a.label.localeCompare(b.label)),
            priorityData: (facet.priorities || []).map((item) => ({ key: item._id, label: priorityLabels[item._id] || item._id, rawLabel: uiPriorityLabels[item._id] || item._id, value: item.value, color: priorityColors[item._id] || '#64748B' })),
            workload: facet.workload || [], attention: (facet.attention || []).map(toInquiry),
            inquiries: (facet.inquiries || []).map(toInquiry), loads: {
                environments: facet.environmentLoad || [], subEnvironments: facet.subEnvironmentLoad || [], rooms: facet.roomLoad || []
            }, access
        };
    }

    async organizationData(access, query, loads) {
        const systemIds = access.systemIds.map(oid);
        const [systems, environments, subEnvironments, rooms] = await Promise.all([
            System.find({ _id: { $in: systemIds }, isActive: true, archivedAt: null }).lean().exec(),
            Environment.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).lean().exec(),
            SubEnvironment.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).lean().exec(),
            Room.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).lean().exec()
        ]);
        const map = (entity, kind) => ({
            id: String(entity._id), name: entity.name, key: entity.key, kind,
            systemId: entity.systemId ? String(entity.systemId) : String(entity._id),
            environmentId: entity.environmentId ? String(entity.environmentId) : null,
            subEnvironmentId: entity.subEnvironmentId ? String(entity.subEnvironmentId) : null,
            status: entity.isActive ? 'תקין' : 'לא פעיל'
        });
        const envItems = environments.map((item) => map(item, 'environment'));
        const subItems = subEnvironments.map((item) => map(item, 'sub'));
        const roomItems = rooms.map((item) => map(item, 'room'));
        const loadMap = (items) => new Map(items.map((item) => [String(item._id), item.value]));
        const envLoad = loadMap(loads.environments); const subLoad = loadMap(loads.subEnvironments); const roomLoad = loadMap(loads.rooms);
        const byId = (items) => new Map(items.map((item) => [item.id, item]));
        const envById = byId(envItems); const subById = byId(subItems);
        const loadRows = {
            environmentLoad: envItems.map((item) => ({ id: item.id, label: item.name, name: item.name, value: envLoad.get(item.id) || 0 })),
            subEnvironmentLoad: subItems.map((item) => ({ id: item.id, label: item.name, name: item.name, contextName: envById.get(item.environmentId)?.name || '', value: subLoad.get(item.id) || 0 })),
            roomLoad: roomItems.map((item) => ({ id: item.id, label: item.name, name: item.name, contextName: subById.get(item.subEnvironmentId)?.name || '', value: roomLoad.get(item.id) || 0 }))
        };
        const scope = { environmentId: query.environmentId || '', subEnvironmentId: query.subEnvironmentId || '', roomId: query.roomId || '' };
        const visibleItems = query.roomId ? roomItems.filter((item) => item.id === query.roomId)
            : query.subEnvironmentId ? [...subItems.filter((item) => item.id === query.subEnvironmentId), ...roomItems.filter((item) => item.subEnvironmentId === query.subEnvironmentId)]
                : query.environmentId ? [...envItems.filter((item) => item.id === query.environmentId), ...subItems.filter((item) => item.environmentId === query.environmentId), ...roomItems.filter((item) => item.environmentId === query.environmentId)]
                    : [...envItems, ...subItems, ...roomItems];
        return { systems: systems.map((item) => map(item, 'system')), environments: envItems, subEnvironments: subItems, rooms: roomItems, visibleItems, selected: visibleItems[0] || null, scope, ...loadRows };
    }

    async controlCenter(userId, query = {}) {
        const analytics = await this.aggregate(userId, { ...query, grouping: 'daily' });
        if (!analytics.access.global) throw new AppError({ statusCode: 403, code: 'CONTROL_CENTER_FORBIDDEN', message: 'System Control Center requires SUPER_ADMIN authority' });
        const organization = await this.organizationData(analytics.access, query, analytics.loads);
        const userData = await this.userManagementService.list(userId, { page: 1, limit: 100 });
        const scopeConditions = [];
        for (const field of ['systemId', 'environmentId', 'subEnvironmentId']) if (query[field]) scopeConditions.push({ [field]: oid(query[field]) });
        if (query.roomId) scopeConditions.push({ roomId: oid(query.roomId) });
        const historyFilter = scopeConditions.length ? { $and: scopeConditions } : { systemId: { $in: analytics.access.systemIds.map(oid) } };
        const auditEvents = await TicketHistory.find(historyFilter)
    .populate('actorUserId', 'displayName email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
    .exec();
        const checks = [];
        if (analytics.metrics.unassigned) checks.push({ id: 'unassigned', severity: 'critical', category: 'תפעול', title: 'פניות ללא מטפל', entity: 'היקף נבחר', explanation: `${analytics.metrics.unassigned} פניות פתוחות ללא שיוך`, detectedAt: 'כעת', action: 'פתח פניות' });
        if (analytics.metrics.overdue) checks.push({ id: 'overdue', severity: 'warning', category: 'תפעול', title: 'פניות באיחור', entity: 'היקף נבחר', explanation: `${analytics.metrics.overdue} פניות פתוחות מעל ${OVERDUE_HOURS} שעות`, detectedAt: 'כעת', action: 'פתח פניות' });
        const activeUsers = userData.items.filter((user) => user.isActive).length;
        const managerCount = userData.items.filter((user) => [
    ROLES.SUPER_ADMIN,
    ROLES.ENVIRONMENT_ADMIN,
    ROLES.SYSTEM_ADMIN,
    ROLES.ROOM_MANAGER
].includes(user.primaryRole)).length;
        const scopeLabel = [
            organization.environments.find((item) => item.id === query.environmentId)?.name,
            organization.subEnvironments.find((item) => item.id === query.subEnvironmentId)?.name,
            organization.rooms.find((item) => item.id === query.roomId)?.name
        ].filter(Boolean).join(' / ') || 'כל המערכת';
        return {
            scopeLabel,
            overview: {
                kpis: [
                    { id: 'open', title: 'פניות פתוחות כעת', value: analytics.metrics.open, trend: '', status: analytics.metrics.open ? 'לטיפול' : 'תקין', icon: 'layers' },
                    { id: 'overdue', title: 'פניות באיחור', value: analytics.metrics.overdue, trend: '', status: analytics.metrics.overdue ? 'חריג' : 'תקין', icon: 'clock' },
                    { id: 'unassigned', title: 'פניות ללא מטפל', value: analytics.metrics.unassigned, trend: '', status: analytics.metrics.unassigned ? 'לטיפול' : 'תקין', icon: 'users' },
                    { id: 'avg', title: 'זמן טיפול ממוצע', value: `${analytics.metrics.averageHandlingHours} ש׳`, trend: '', status: 'תקין', icon: 'activity' },
                    { id: 'rooms', title: 'חדרים עם פניות פתוחות', value: organization.roomLoad.filter((item) => item.value > 0).length, trend: '', status: 'תקין', icon: 'alertTriangle' },
                    { id: 'users', title: 'משתמשים פעילים', value: activeUsers, trend: '', status: 'תקין', icon: 'users' }
                ],
                trend: analytics.activityTrend, trendSubtitle: 'פניות שנפתחו מול נסגרו בטווח שנבחר',
                trendBounds: { minDate: analytics.activityTrend[0]?.label || '', maxDate: analytics.activityTrend.at(-1)?.label || '' },
                attention: checks.slice(0, 3)
            },
            performance: {
                workload: analytics.workload,
                environmentLoad: organization.environmentLoad,
                subEnvironmentLoad: organization.subEnvironmentLoad,
                roomLoad: organization.roomLoad,
                categories: analytics.priorityData.map((item) => ({ label: item.label, value: item.value })),
                assignment: [], assignmentFailures: 0,
                response: [
                    { label: 'זמן טיפול ממוצע', value: analytics.metrics.averageHandlingHours },
                    { label: 'פניות באיחור', value: analytics.metrics.overdue },
                    { label: 'טופלו לאחרונה', value: analytics.metrics.recentlyHandled }
                ],
                openVsClosed: [{ label: 'נפתחו', value: analytics.metrics.open }, { label: 'נסגרו', value: analytics.metrics.closed }]
            },
            organization,
            users: {
                rows: userData.items.map((user) => ({ id: user.id, personalNumberMasked: user.personalNumberMasked, name: user.displayName, status: user.isActive ? 'פעיל' : 'לא פעיל', primaryRole: user.primaryRole, roleLabel: user.primaryScope?.roleLabel || '', scopeLabel: user.primaryScope?.scopeLabel || '', lastActivity: user.lastLoginAt || user.updatedAt, anomalies: 0 })),
                kpis: [
                    { title: 'סה״כ משתמשים', value: userData.pagination.totalItems, tone: 'neutral' },
                    { title: 'משתמשים פעילים', value: activeUsers, tone: 'success' },
                    { title: 'ללא שיוך פעיל', value: userData.items.filter((user) => !user.primaryRole).length, tone: 'warning' },
                    { title: 'מנהלים', value: managerCount, tone: 'primary' },
                    { title: 'הרשאות חריגות', value: 0, tone: 'danger' }
                ]
            },
            checks,
            auditEvents: auditEvents.map((event) => ({
    id: String(event._id),
    type: event.eventType,
    action: event.eventType,
    actor: event.actorUserId?.displayName
        || String(event.actorUserId?._id || event.actorUserId),
    timestamp: event.createdAt,
    date: new Intl.DateTimeFormat('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(event.createdAt),
    result: 'הושלם',
    entity: event.ticketNumber,
    scope: String(event.roomId),
    details: event.changedFields.join(', ')
}))
        };
    }
}

module.exports = AnalyticsService;
module.exports.METRIC_DEFINITIONS = { OVERDUE_HOURS, RECENTLY_HANDLED_DAYS };