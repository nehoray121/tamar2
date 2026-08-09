const AppError = require('../../errors/AppError.js');
const { ORGANIZATION_LIMITS } = require('./constants.js');

const validationError = (message, fieldErrors = null) => new AppError({
    statusCode: 400,
    code: 'ORGANIZATION_VALIDATION_ERROR',
    message,
    fieldErrors
});

const normalizeOrganizationKey = (value) => {
    const key = String(value ?? '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    if (key.length < ORGANIZATION_LIMITS.KEY_MIN || key.length > ORGANIZATION_LIMITS.KEY_MAX) {
        throw validationError('Organization key length is invalid', {
            key: `Key must contain ${ORGANIZATION_LIMITS.KEY_MIN}-${ORGANIZATION_LIMITS.KEY_MAX} characters`
        });
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(key)) {
        throw validationError('Organization key contains unsupported characters', {
            key: 'Use letters, numbers, hyphens or underscores'
        });
    }
    return key;
};

const normalizeOrganizationName = (value) => {
    const name = String(value ?? '').normalize('NFKC').trim();
    if (!name || name.length > ORGANIZATION_LIMITS.NAME_MAX) {
        throw validationError('Organization name is invalid', {
            name: `Name is required and may contain up to ${ORGANIZATION_LIMITS.NAME_MAX} characters`
        });
    }
    return name;
};

const normalizeOrganizationDescription = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const description = String(value).normalize('NFKC').trim();
    if (description.length > ORGANIZATION_LIMITS.DESCRIPTION_MAX) {
        throw validationError('Organization description is too long', {
            description: `Description may contain up to ${ORGANIZATION_LIMITS.DESCRIPTION_MAX} characters`
        });
    }
    return description || undefined;
};

const validateOrganizationLifecycle = (entity) => {
    if (entity.archivedAt && entity.isActive) {
        throw validationError('Archived organization entities cannot be active');
    }
    if (entity.archivedAt && !entity.archivedBy) {
        throw validationError('Archived organization entities require archivedBy');
    }
};

const sanitizeOrganizationPayload = (payload, allowedFields) => {
    const unknownFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
        throw validationError('Unknown organization fields are not allowed', {
            unknownFields
        });
    }
    return Object.fromEntries(allowedFields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]));
};

module.exports = { organizationValidationError: validationError, normalizeOrganizationKey, normalizeOrganizationName, normalizeOrganizationDescription, validateOrganizationLifecycle, sanitizeOrganizationPayload };
