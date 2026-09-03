export const ROLE_KEYS = Object.freeze({ SUPER_ADMIN: 'SUPER_ADMIN', SYSTEM_ADMIN: 'SYSTEM_ADMIN', ROOM_MANAGER: 'ROOM_MANAGER', ROOM_USER: 'ROOM_USER' });
export const roleLabels = Object.freeze({
    [ROLE_KEYS.SUPER_ADMIN]: 'מנהל־על',
    [ROLE_KEYS.SYSTEM_ADMIN]: 'מנהל תת־סביבה',
    [ROLE_KEYS.ROOM_MANAGER]: 'מנהל חדר',
    [ROLE_KEYS.ROOM_USER]: 'משתמש בחדר'
});