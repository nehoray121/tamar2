export const mockUserDirectory = {
    c9812512: { id: 'c9812512', name: 'עטיה נהוראי' },
    s7640130: { id: 's7640130', name: 'גל אילוז' },
    s1122334: { id: 's1122334', name: 'משה כהן' },
    s4433221: { id: 's4433221', name: 'דנה לוי' }
};

export const scopeTree = {
    environments: [
        {
            id: 'technology',
            name: 'אגף טכנולוגיה',
            subEnvironments: [
                { id: 'ops', name: 'צוות תשתיות', rooms: [{ id: 'manday', name: 'מנדיי' }, { id: 'networks', name: 'רשתות' }] },
                { id: 'support', name: 'מוקד תמיכה', rooms: [{ id: 'service', name: 'שירות לקוחות' }] }
            ]
        },
        {
            id: 'operations',
            name: 'תפעול ומידע רשתי',
            subEnvironments: [
                { id: 'field', name: 'תפעול שטח', rooms: [{ id: 'control', name: 'חמ״ל תפעול' }] }
            ]
        }
    ]
};
