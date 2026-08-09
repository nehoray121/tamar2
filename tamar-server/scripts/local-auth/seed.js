const mongoose = require('mongoose');
const System = require('../../src/models/System.js');
const Environment = require('../../src/models/Environment.js');
const SubEnvironment = require('../../src/models/SubEnvironment.js');
const Room = require('../../src/models/Room.js');
const User = require('../../src/models/User.js');
const OrganizationMembership = require('../../src/models/OrganizationMembership.js');
const PersonalNumberService = require('../../src/auth/PersonalNumberService.js');
const { ROLES, ROLE_SCOPE_TYPES } = require('../../src/domain/access/constants.js');
const { DEVELOPMENT_HIERARCHY_KEYS, DEVELOPMENT_IDENTITIES } = require('./fixtures.js');
const { DEVELOPMENT_PERSONAL_NUMBER_PATTERN, createDevelopmentSubject } = require('./identity.js');

const required = (name) => {
    const value = String(process.env[name] ?? '').trim();
    if (!value) throw new Error(`Missing required seed setting: ${name}`);
    return value;
};
const assertDevelopmentTarget = () => {
    if (required('NODE_ENV') !== 'development') throw new Error('Development seed requires NODE_ENV=development');
    if (required('TAMAR_AUTH_MODE') !== 'local-personal-number') throw new Error('Development seed requires local-personal-number mode');
    if (required('MONGODB_DATABASE') !== 'tamar_dev') throw new Error('Development seed may write only to tamar_dev');
    const uri = required('MONGODB_URI');
    if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) throw new Error('MONGODB_URI is invalid');
    const parsed = new URL(uri);
    const hosts = parsed.host.split(',').map((host) => host.split(':')[0].replace(/^\[|\]$/g, '').toLowerCase());
    if (!hosts.every((host) => ['127.0.0.1', 'localhost', '::1'].includes(host))) {
        throw new Error('Development seed refuses non-local MongoDB hosts');
    }
    const issuer = required('SSO_ISSUER');
    if (!issuer.startsWith('http://127.0.0.1:') && !issuer.startsWith('http://localhost:')) {
        throw new Error('Development seed refuses a non-local identity issuer');
    }
    return uri;
};
const upsertEntity = async (Model, filter, insert) => Model.findOneAndUpdate(
    filter,
    { $setOnInsert: insert },
    { upsert: true, returnDocument: 'after', runValidators: true }
);
const membershipPayload = ({ userId, role, system, environment, subEnvironment, room, assignedBy }) => {
    const scopeType = ROLE_SCOPE_TYPES[role];
    const scopeId = role === ROLES.SUPER_ADMIN
        ? system._id
        : role === ROLES.SYSTEM_ADMIN
            ? subEnvironment._id
            : room._id;
    return {
        userId,
        role,
        scopeType,
        scopeId,
        systemId: system._id,
        ...(role === ROLES.SUPER_ADMIN ? {} : { environmentId: environment._id, subEnvironmentId: subEnvironment._id }),
        ...([ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role) ? { roomId: room._id } : {}),
        isActive: true,
        assignedBy
    };
};
const seed = async () => {
    const uri = assertDevelopmentTarget();
    await mongoose.connect(uri, { dbName: 'tamar_dev', autoIndex: true, serverSelectionTimeoutMS: 8_000 });
    if (process.argv.includes('--reset')) {
        if (!process.argv.includes('--confirm-reset=tamar_dev')) {
            throw new Error('Reset requires the explicit --confirm-reset=tamar_dev confirmation');
        }
        if (mongoose.connection.db?.databaseName !== 'tamar_dev') throw new Error('Refusing to reset any database other than tamar_dev');
        await mongoose.connection.dropDatabase();
    }

    const system = await upsertEntity(System, { key: DEVELOPMENT_HIERARCHY_KEYS.system }, {
        key: DEVELOPMENT_HIERARCHY_KEYS.system,
        name: 'System S1',
        description: 'Synthetic local-development system',
        isActive: true
    });
    const environment = await upsertEntity(Environment, { systemId: system._id, key: DEVELOPMENT_HIERARCHY_KEYS.environment }, {
        systemId: system._id,
        key: DEVELOPMENT_HIERARCHY_KEYS.environment,
        name: 'Environment E1',
        description: 'Synthetic local-development environment',
        isActive: true
    });
    const subEnvironment = await upsertEntity(SubEnvironment, {
        environmentId: environment._id,
        key: DEVELOPMENT_HIERARCHY_KEYS.subEnvironment
    }, {
        systemId: system._id,
        environmentId: environment._id,
        key: DEVELOPMENT_HIERARCHY_KEYS.subEnvironment,
        name: 'SubEnvironment SE1',
        description: 'Synthetic local-development sub-environment',
        isActive: true
    });

    const roomNames = Object.freeze({ 'room-a': 'Room A', 'room-b': 'Room B', 'room-c': 'Room C' });
    const rooms = {};
    for (const key of DEVELOPMENT_HIERARCHY_KEYS.rooms) {
        rooms[key] = await upsertEntity(Room, { subEnvironmentId: subEnvironment._id, key }, {
            systemId: system._id,
            environmentId: environment._id,
            subEnvironmentId: subEnvironment._id,
            key,
            name: roomNames[key],
            description: 'Synthetic local-development room',
            isActive: true
        });
    }

    const personalNumbers = new PersonalNumberService({
        hmacKey: required('IDENTITY_LOOKUP_HMAC_KEY'),
        pattern: DEVELOPMENT_PERSONAL_NUMBER_PATTERN
    });
    const users = {};
    const baselineIdentities = DEVELOPMENT_IDENTITIES.filter((identity) => identity.key === 'requested-super-admin');
    for (const identity of baselineIdentities) {
        const protection = personalNumbers.protect(identity.personalNumber);
        users[identity.key] = await User.findOneAndUpdate(
            { personalNumberLookupHash: protection.lookupHash },
            { $setOnInsert: {
                externalIdentity: {
                    provider: 'local-development',
                    subject: createDevelopmentSubject(identity.personalNumber)
                },
                personalNumberLookupHash: protection.lookupHash,
                personalNumberLast4: protection.last4,
                displayName: identity.displayName,
                email: identity.email,
                isActive: true,
                lastIdentitySyncAt: new Date()
            } },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).select('+personalNumberLookupHash +personalNumberLast4');
    }

    const bootstrapAdmin = users['requested-super-admin'];
    for (const identity of baselineIdentities.filter((item) => item.role)) {
        const payload = membershipPayload({
            userId: users[identity.key]._id,
            role: identity.role,
            system,
            environment,
            subEnvironment,
            room: identity.roomKey ? rooms[identity.roomKey] : null,
            assignedBy: bootstrapAdmin._id
        });
        await OrganizationMembership.findOneAndUpdate(
            {
                userId: payload.userId,
                role: payload.role,
                scopeType: payload.scopeType,
                scopeId: payload.scopeId,
                isActive: true
            },
            { $setOnInsert: payload },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
    }

    const counts = {
        systems: await System.countDocuments({ key: DEVELOPMENT_HIERARCHY_KEYS.system }),
        environments: await Environment.countDocuments({ systemId: system._id, key: DEVELOPMENT_HIERARCHY_KEYS.environment }),
        subEnvironments: await SubEnvironment.countDocuments({ environmentId: environment._id, key: DEVELOPMENT_HIERARCHY_KEYS.subEnvironment }),
        rooms: await Room.countDocuments({ subEnvironmentId: subEnvironment._id, key: { $in: DEVELOPMENT_HIERARCHY_KEYS.rooms } }),
        users: await User.countDocuments({ 'externalIdentity.provider': 'local-development' }),
        memberships: await OrganizationMembership.countDocuments({
            userId: { $in: Object.values(users).map((user) => user._id) },
            isActive: true
        })
    };
    console.log(JSON.stringify({ event: 'local-auth.seed.completed', database: 'tamar_dev', counts }));
};

seed()
    .catch((error) => {
        console.error(JSON.stringify({ event: 'local-auth.seed.failed', message: error.message }));
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
