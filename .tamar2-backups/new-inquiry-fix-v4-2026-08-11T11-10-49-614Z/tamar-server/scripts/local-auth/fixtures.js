const DEVELOPMENT_IDENTITIES = Object.freeze([
    Object.freeze({ key: 'room-user-a', personalNumber: '990000001', displayName: 'Development ROOM_USER A', email: 'room-user-a@tamar.local.invalid', role: 'ROOM_USER', roomKey: 'room-a' }),
    Object.freeze({ key: 'room-user-b', personalNumber: '990000002', displayName: 'Development ROOM_USER B', email: 'room-user-b@tamar.local.invalid', role: 'ROOM_USER', roomKey: 'room-b' }),
    Object.freeze({ key: 'room-manager-a', personalNumber: '990000003', displayName: 'Development ROOM_MANAGER A', email: 'room-manager-a@tamar.local.invalid', role: 'ROOM_MANAGER', roomKey: 'room-a' }),
    Object.freeze({ key: 'system-admin', personalNumber: '990000004', displayName: 'Development SYSTEM_ADMIN', email: 'system-admin@tamar.local.invalid', role: 'SYSTEM_ADMIN' }),
    Object.freeze({ key: 'super-admin', personalNumber: '990000005', displayName: 'Development SUPER_ADMIN', email: 'super-admin@tamar.local.invalid', role: 'SUPER_ADMIN' }),
    Object.freeze({ key: 'requested-super-admin', personalNumber: '1234567', displayName: 'Nehoray Atia', email: 'super-admin-local@tamar.local.invalid', role: 'SUPER_ADMIN' }),
    Object.freeze({ key: 'no-membership', personalNumber: '990000006', displayName: 'Development no-access User', email: 'no-access@tamar.local.invalid', role: null })
]);

const DEVELOPMENT_HIERARCHY_KEYS = Object.freeze({
    system: 'tamar-local-s1',
    environment: 'tamar-local-e1',
    subEnvironment: 'tamar-local-se1',
    rooms: Object.freeze(['room-a', 'room-b', 'room-c'])
});

module.exports = { DEVELOPMENT_HIERARCHY_KEYS, DEVELOPMENT_IDENTITIES };
