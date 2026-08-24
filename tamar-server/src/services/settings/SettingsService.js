const AppError = require('../../errors/AppError.js');
const OrganizationSetting = require('../../models/OrganizationSetting.js');
const { createDefaultRoomSettings } = require('./defaultRoomSettings.js');

const MAX_SETTINGS_BYTES = 256 * 1024;
const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
const sameId = (left, right) => String(left ?? '') === String(right ?? '');

const validateSafeValue = (value, path = 'value', depth = 0) => {
    if (depth > 16) {
        throw new AppError({
            statusCode: 400,
            code: 'SETTINGS_VALUE_INVALID',
            message: 'Settings value is too deeply nested'
        });
    }

    if (value === null || ['string', 'boolean'].includes(typeof value)) return;
    if (typeof value === 'number' && Number.isFinite(value)) return;

    if (Array.isArray(value)) {
        if (value.length > 1000) {
            throw new AppError({
                statusCode: 400,
                code: 'SETTINGS_VALUE_INVALID',
                message: `${path} contains too many values`
            });
        }
        value.forEach((item, index) => validateSafeValue(
            item,
            `${path}[${index}]`,
            depth + 1
        ));
        return;
    }

    if (!value
        || typeof value !== 'object'
        || Object.getPrototypeOf(value) !== Object.prototype) {
        throw new AppError({
            statusCode: 400,
            code: 'SETTINGS_VALUE_INVALID',
            message: `${path} contains an unsupported value`
        });
    }

    for (const [key, nested] of Object.entries(value)) {
        if (blockedKeys.has(key)) {
            throw new AppError({
                statusCode: 400,
                code: 'SETTINGS_VALUE_INVALID',
                message: `${path} contains a forbidden key`
            });
        }
        validateSafeValue(nested, `${path}.${key}`, depth + 1);
    }
};

class SettingsService {
    constructor({ organization, scopeResolver, realtimePublisher }) {
        Object.assign(this, {
            organization,
            scopeResolver,
            realtimePublisher
        });
    }

    async authorize(userId, roomId, { write = false } = {}) {
        const [access, lineage] = await Promise.all([
            this.scopeResolver.resolveEffectiveAccess(userId),
            this.organization.integrityService.resolveRoom(roomId, {
                requireOperational: true
            })
        ]);

        const isSuperAdmin = access.global
            && access.systemIds.some((id) => sameId(id, lineage.system._id));
        const canAccessRoom = access.roomIds.some((id) => sameId(id, roomId));
        const canManageRoom = access.managedRoomIds.some(
            (id) => sameId(id, roomId)
        );

        if (!access.isActive
            || (!isSuperAdmin && !canAccessRoom)
            || (write && !isSuperAdmin && !canManageRoom)) {
            throw new AppError({
                statusCode: 403,
                code: write
                    ? 'SETTINGS_UPDATE_FORBIDDEN'
                    : 'SETTINGS_SCOPE_FORBIDDEN',
                message: write
                    ? 'Only an authorized manager can change room settings'
                    : 'Settings scope is outside the authenticated user authority'
            });
        }

        return lineage;
    }

    async get(userId, roomId) {
        await this.authorize(userId, roomId);
        const setting = await OrganizationSetting.findOne({
            scopeType: 'ROOM',
            scopeId: roomId,
            namespace: 'room-settings'
        }).lean().exec();

        return setting
            ? {
                value: setting.value,
                version: setting.version,
                updatedAt: setting.updatedAt
            }
            : {
                value: createDefaultRoomSettings(roomId),
                version: 0,
                updatedAt: null
            };
    }

    async save(userId, roomId, expectedVersion, value) {
        const serialized = JSON.stringify(value);
        if (Buffer.byteLength(serialized, 'utf8') > MAX_SETTINGS_BYTES) {
            throw new AppError({
                statusCode: 413,
                code: 'SETTINGS_VALUE_TOO_LARGE',
                message: 'Settings payload is too large'
            });
        }

        validateSafeValue(value);
        const lineage = await this.authorize(userId, roomId, { write: true });
        let setting;

        if (expectedVersion === 0) {
            try {
                setting = await OrganizationSetting.create({
                    scopeType: 'ROOM',
                    scopeId: lineage.room._id,
                    namespace: 'room-settings',
                    systemId: lineage.system._id,
                    environmentId: lineage.environment._id,
                    subEnvironmentId: lineage.subEnvironment._id,
                    roomId: lineage.room._id,
                    value,
                    version: 1,
                    updatedBy: userId
                });
            } catch (error) {
                if (error?.code === 11000) {
                    throw new AppError({
                        statusCode: 409,
                        code: 'SETTINGS_VERSION_CONFLICT',
                        message: 'Settings were created by another request',
                        cause: error
                    });
                }
                throw error;
            }
        } else {
            setting = await OrganizationSetting.findOneAndUpdate(
                {
                    scopeType: 'ROOM',
                    scopeId: roomId,
                    namespace: 'room-settings',
                    version: expectedVersion
                },
                {
                    $set: { value, updatedBy: userId },
                    $inc: { version: 1 }
                },
                {
                    returnDocument: 'after',
                    runValidators: true
                }
            ).exec();

            if (!setting) {
                throw new AppError({
                    statusCode: 409,
                    code: 'SETTINGS_VERSION_CONFLICT',
                    message: 'Settings changed while being edited'
                });
            }
        }

        this.realtimePublisher?.settingsUpdated(setting);

        return {
            value: setting.value,
            version: setting.version,
            updatedAt: setting.updatedAt
        };
    }
}

module.exports = SettingsService;
module.exports.validateSafeValue = validateSafeValue;
