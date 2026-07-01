export const roleLabels = {
    super_admin: 'מנהל-על',
    environment_admin: 'מנהל סביבה',
    sub_environment_admin: 'מנהל תת-סביבה',
    room_admin: 'מנהל חדר'
};

export const initialManagedUsers = [
    {
        id: 'c9812512',
        name: 'עטיה נהוראי',
        status: 'active',
        primaryRole: 'environment_admin',
        primaryScope: { environmentId: 'technology' },
        assignments: [{ id: 'a-1', role: 'room_admin', scope: { environmentId: 'technology', subEnvironmentId: 'ops', roomId: 'manday' } }],
        history: [{ id: 'h-1', text: 'משתמש נוצר במערכת', time: '28.6.2026 13:30' }]
    },
    {
        id: 's7640130',
        name: 'גל אילוז',
        status: 'active',
        primaryRole: 'super_admin',
        primaryScope: {},
        assignments: [],
        history: [{ id: 'h-2', text: 'הוגדרה דרגת מנהל-על', time: '28.6.2026 13:35' }]
    },
    {
        id: 's1122334',
        name: 'משה כהן',
        status: 'inactive',
        primaryRole: 'room_admin',
        primaryScope: { environmentId: 'technology', subEnvironmentId: 'ops', roomId: 'networks' },
        assignments: [],
        history: [{ id: 'h-3', text: 'המשתמש הושבת', time: '28.6.2026 13:40' }]
    }
];
