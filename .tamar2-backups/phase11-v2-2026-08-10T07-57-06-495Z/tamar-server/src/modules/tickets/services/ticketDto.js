const id = (value) => value ? String(value) : null;

const toTicketDto = (ticket, capabilities, activeAssignees = []) => ({
    id: id(ticket._id),
    ticketNumber: ticket.ticketNumber,
    sequenceNumber: ticket.sequenceNumber,
    systemId: id(ticket.systemId),
    environmentId: id(ticket.environmentId),
    subEnvironmentId: id(ticket.subEnvironmentId),
    originalRoomId: id(ticket.originalRoomId),
    currentRoomId: id(ticket.currentRoomId),
    activeTransferId: id(ticket.activeTransferId),
    visibleRoomIds: (ticket.visibleRoomIds || []).map(id),
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    fieldValues: ticket.fieldValues || {},
    status: ticket.status,
    creator: { id: id(ticket.createdBy) },
    activeAssigneeIds: (ticket.activeAssigneeIds || []).map(id),
    activeAssignees,
    closure: ticket.status === 'CLOSED' ? {
        closedBy: id(ticket.closedBy), closedAt: ticket.closedAt, summary: ticket.closureSummary
    } : null,
    version: ticket.version,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    capabilities
});

const toAssignmentDto = (assignment, summaries) => ({
    id: id(assignment._id),
    user: summaries.get(id(assignment.userId)) || { id: id(assignment.userId), displayName: null, email: null },
    roomId: id(assignment.roomId),
    assignedBy: summaries.get(id(assignment.assignedBy)) || { id: id(assignment.assignedBy), displayName: null, email: null },
    assignedAt: assignment.assignedAt,
    source: assignment.assignmentSource,
    isActive: assignment.isActive,
    endedBy: assignment.endedBy
        ? (summaries.get(id(assignment.endedBy)) || { id: id(assignment.endedBy), displayName: null, email: null })
        : null,
    endedAt: assignment.endedAt || null,
    endedReason: assignment.endedReason || null
});

const toHistoryDto = (entry) => ({
    id: id(entry._id),
    ticketId: id(entry.ticketId),
    ticketNumber: entry.ticketNumber,
    eventType: entry.eventType,
    actor: { userId: id(entry.actorUserId), roleContext: entry.actorRoleContext },
    versionBefore: entry.versionBefore,
    versionAfter: entry.versionAfter,
    changedFields: entry.changedFields,
    changes: entry.changes || {},
    metadata: entry.metadata || {},
    createdAt: entry.createdAt
});

module.exports = { toTicketDto, toAssignmentDto, toHistoryDto };
