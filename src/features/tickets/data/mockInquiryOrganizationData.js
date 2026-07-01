export const initialInquiryCategories = [
    { id: 'all', name: 'כל הפניות', color: '#3B82F6', system: true },
    { id: 'customer-waiting', name: 'ממתינים לתשובת הלקוח', color: '#F97316' },
    { id: 'infrastructure', name: 'תשתיות', color: '#06B6D4' }
];

export const initialTickets = [
    { id: 'M-16-338...', priority: 'נמוכה-3', name: 'עטיה נהוראי', room: '44444444444', phone: 'לא זמין', date: '12 ביוני 2026', status: 'open', originalIndex: 0, categoryId: 'customer-waiting' },
    { id: '26T3933', priority: 'נמוכה-3', name: 'עטיה נהוראי', room: '555345345', phone: 'לא זמין', date: '11 ביוני 2026', status: 'open', originalIndex: 1, categoryId: 'customer-waiting' },
    { id: 'A-22-192...', priority: 'גבוהה-1', name: 'משה כהן', room: '33333333333', phone: '050-1234567', date: '10 ביוני 2026', status: 'open', originalIndex: 2, categoryId: null },
    { id: 'B-88-123...', priority: 'נמוכה-3', name: 'דנה לוי', room: '22222222222', phone: '054-9876543', date: '09 ביוני 2026', status: 'open', originalIndex: 3, categoryId: null },
    { id: 'C-44-555...', priority: 'גבוהה-1', name: 'רועי שמש', room: '11111111111', phone: 'לא זמין', date: '08 ביוני 2026', status: 'open', originalIndex: 4, categoryId: 'customer-waiting' },
    { id: 'D-99-888', priority: 'בינונית-2', name: 'לירון אברהם', room: '88888888888', phone: '052-1112233', date: '07 ביוני 2026', status: 'open', originalIndex: 5, categoryId: 'infrastructure' },
    { id: 'E-11-222', priority: 'נמוכה-3', name: 'מאיה כץ', room: '99999999999', phone: 'לא זמין', date: '06 ביוני 2026', status: 'open', originalIndex: 6, categoryId: null },
    { id: 'M-15-901', priority: 'בינונית-2', name: 'נועה לוי', room: '77777777777', phone: '050-7654321', date: '01 ביוני 2026', status: 'closed', closeDate: '13 ביוני 2026', closureSummary: 'טופל מול הלקוח ואומת תקין.', originalIndex: 7, categoryId: null }
];
