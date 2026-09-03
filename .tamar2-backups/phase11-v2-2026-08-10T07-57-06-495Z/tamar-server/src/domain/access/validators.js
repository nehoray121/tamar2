const mongoose = require('mongoose');
const AppError = require('../../errors/AppError.js');
const {
    REQUESTABLE_ROLES,
    ROLE_AUTHORITY,
    ROLE_SCOPE_TYPES,
    ROLE_VALUES,
    SCOPE_TYPE_VALUES,
    SCOPE_TYPES
} = require('./constants.js');

const validationError = (message, fieldErrors = null) => new AppError({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    fieldErrors
});

const normalizeExternalIdentity = (identity = {}) => {
    const provider = String(identity.provider ?? '').trim().toLowerCase();
    const subject = String(identity.subject ?? '').trim();

    if (!provider || !subject) {
        throw validationError('External identity requires provider and subject');
    }

    return { provider, subject };
};

const assertKnownRole = (role) => {
    if (!ROLE_VALUES.includes(role)) {
        throw validationError('Unknown role', { role: 'Role is not supported' });
    }
    return role;
};

const assertKnownScopeType = (scopeType) => {
    if (!SCOPE_TYPE_VALUES.includes(scopeType)) {
        throw validationError('Unknown scope type', { scopeType: 'Scope type is not supported' });
    }
    return scopeType;
};

const assertRoleScopeCompatibility = (role, scopeType) => {
    assertKnownRole(role);
    assertKnownScopeType(scopeType);
    if (ROLE_SCOPE_TYPES[role] !== scopeType) {
        throw validationError('Role is not compatible with scope type', {
            role: `${role} requires ${ROLE_SCOPE_TYPES[role]}`,
            scopeType: `${scopeType} is not valid for ${role}`
        });
    }
};

const assertRequestableRole = (role) => {
    assertKnownRole(role);
    if (!REQUESTABLE_ROLES.includes(role)) {
        throw validationError('Role cannot be requested through Access Request', {
            role: 'SUPER_ADMIN and deprecated roles are forbidden'
        });
    }
};

const assertRequestRoleScopeCompatibility = (role, scopeType) => {
    assertRequestableRole(role);
    assertRoleScopeCompatibility(role, scopeType);
};

const assertObjectId = (value, fieldName) => {
    if (!mongoose.isValidObjectId(value)) {
        throw validationError(`${fieldName} must be a valid identifier`, {
            [fieldName]: 'Invalid identifier'
        });
    }
};

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

const assertHierarchyReferences = ({
    role,
    scopeType,
    scopeId,
    systemId,
    environmentId,
    subEnvironmentId,
    roomId
}) => {
    assertRoleScopeCompatibility(role, scopeType);
    assertObjectId(scopeId, 'scopeId');
    assertObjectId(systemId, 'systemId');

    if (scopeType === SCOPE_TYPES.SYSTEM) {
        if (!sameId(scopeId, systemId) || environmentId || subEnvironmentId || roomId) {
            throw validationError('SYSTEM scope references are inconsistent');
        }
        return;
    }

    assertObjectId(environmentId, 'environmentId');
    assertObjectId(subEnvironmentId, 'subEnvironmentId');

    if (scopeType === SCOPE_TYPES.SUB_ENVIRONMENT) {
        if (!sameId(scopeId, subEnvironmentId) || roomId) {
            throw validationError('SUB_ENVIRONMENT scope references are inconsistent');
        }
        return;
    }

    assertObjectId(roomId, 'roomId');
    if (!sameId(scopeId, roomId)) {
        throw validationError('ROOM scope references are inconsistent');
    }
};

const assertApprovedRoleNotHigher = (requestedRole, approvedRole) => {
    assertRequestableRole(requestedRole);
    assertRequestableRole(approvedRole);
    if (ROLE_AUTHORITY[approvedRole] > ROLE_AUTHORITY[requestedRole]) {
        throw validationError('Approved role cannot exceed the requested role');
    }
};

const toIdSet = (values = []) => new Set(values.filter(Boolean).map((value) => String(value)));

module.exports = { normalizeExternalIdentity, assertKnownRole, assertKnownScopeType, assertRoleScopeCompatibility, assertRequestableRole, assertRequestRoleScopeCompatibility, assertObjectId, assertHierarchyReferences, assertApprovedRoleNotHigher, toIdSet };
