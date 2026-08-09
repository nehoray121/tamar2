const cloneField = (field) => ({
    ...field,
    options: [...(field.options || [])],
    dependencyMap: { ...(field.dependencyMap || {}) },
    linkConfig: { ...(field.linkConfig || {}) }
});

export const fieldTemplates = [
    { type: 'text', name: 'טקסט קצר', typeLabel: 'טקסט קצר', example: 'שדה להזנת תשובה קצרה.', icon: 'filePlus' },
    { type: 'longtext', name: 'טקסט חופשי', typeLabel: 'טקסט חופשי', example: 'שדה להזנת תיאור מפורט.', icon: 'list' },
    { type: 'select', name: 'בחירה מרשימה', typeLabel: 'בחירה', example: 'בחירת אפשרות אחת מתוך רשימה.', icon: 'chevronDown' },
    { type: 'multiselect', name: 'בחירה מרובה', typeLabel: 'בחירה מרובה', example: 'בחירת כמה אפשרויות מתוך רשימה.', icon: 'list' },
    { type: 'date', name: 'תאריך', typeLabel: 'תאריך', example: 'בחירת תאריך באמצעות לוח שנה.', icon: 'calendar' },
    { type: 'link', name: 'קישור', typeLabel: 'קישור', example: 'הצגת קישור פנימי או חיצוני.', icon: 'link' }
];

export const selectorFieldTypes = ['select', 'multiselect'];
export const isSelectorField = (field) => selectorFieldTypes.includes(field?.type);

export const defaultIncidentDescriptionSettings = {
    label: 'תיאור תקלה',
    placeholder: 'לדוגמה: תיאור הפנייה, דרך פתרון...',
    helpText: '',
    required: true
};

export const defaultIncidentDescriptionTemplates = [
    {
        id: 'incident-template-repeat-failure',
        title: 'תקלה חוזרת',
        enabled: true,
        content: 'הלקוח מדווח על תקלה חוזרת. נדרש לבדוק זמינות שירותים, לבצע אימות פרטים ולתעד פעולות שבוצעו.'
    },
    {
        id: 'incident-template-assistance-request',
        title: 'בקשת סיוע',
        enabled: true,
        content: 'נפתחה פנייה בעקבות בקשת סיוע. יש לשייך נציג מטפל ולעדכן סטטוס לאחר יצירת קשר.'
    },
    {
        id: 'incident-template-infrastructure-followup',
        title: 'המשך טיפול תשתיות',
        enabled: true,
        content: 'נדרש טיפול המשך מול צוות תשתיות. יש לציין מיקום, גורם מטפל ולצרף פירוט מלא של התקלה.'
    }
];

const commonField = {
    active: true,
    visible: true,
    showInNewInquiry: true,
    showInRow: true,
    showInDetails: true,
    width: 'חצי רוחב',
    scope: 'system'
};

export const defaultInquiryFields = [
    { ...commonField, id: 'priority', group: 'system', name: 'דחיפות', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'רמת דחיפות הפנייה', options: ['גבוהה-1', 'בינונית-2', 'נמוכה-3'] },
    { ...commonField, id: 'handler', group: 'room', name: 'גורם מטפל', type: 'user', typeLabel: 'משתמש', required: true, locked: true, placeholder: 'בחר גורם מטפל' },
    { ...commonField, id: 'customerId', group: 'system', name: 'מ.א של הלקוח', type: 'text', typeLabel: 'טקסט קצר', required: true, locked: true, placeholder: 'הכנס/י מספר לקוח' },
    { ...commonField, id: 'treatment', group: 'room', name: 'אופן טיפול בפנייה', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'אופן טיפול', options: ['הפנייה בטיפול', 'טופל במקום', 'ממתין ללקוח'] },
    { ...commonField, id: 'description', key: 'incidentDescription', role: 'incident-description', group: 'system', name: 'תיאור תקלה', type: 'longtext', typeLabel: 'טקסט חופשי', required: true, locked: true, placeholder: 'תיאור מפורט', width: 'רוחב מלא' },
    { ...commonField, id: 'location', group: 'room', name: 'מיקום', type: 'text', typeLabel: 'טקסט קצר', required: false, placeholder: 'מיקום' },
    { ...commonField, id: 'city', group: 'room', name: 'עיר', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר עיר', options: ['תל אביב', 'חיפה', 'ירושלים'] },
    { ...commonField, id: 'neighborhood', group: 'room', name: 'שכונה', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר שכונה', options: ['פלורנטין', 'יפו', 'רמת אביב', 'נווה צדק', 'הדר', 'רחביה', 'תלפיות', 'גילה', 'פסגת זאב'], parentId: 'city', dependencyMap: { 'תל אביב': ['פלורנטין', 'יפו', 'רמת אביב', 'נווה צדק'], 'חיפה': ['הדר'], 'ירושלים': ['רחביה', 'תלפיות', 'גילה', 'פסגת זאב'] } },
    { ...commonField, id: 'status', group: 'system', name: 'סטטוס', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'סטטוס', options: ['פתוחה', 'בטיפול', 'סגורה'] },
    { ...commonField, id: 'openDate', group: 'system', name: 'תאריך פתיחה', type: 'date', typeLabel: 'תאריך', required: true, locked: true, placeholder: 'תאריך פתיחה' },
    { ...commonField, id: 'phone', group: 'system', name: 'טלפון', type: 'phone', typeLabel: 'טלפון', required: false, placeholder: 'טלפון ליצירת קשר' },
    { ...commonField, id: 'network', group: 'room', name: 'סוג רשת', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר סוג רשת', options: ['סודי', 'גלוי'] },
    { ...commonField, id: 'closingDate', group: 'system', name: 'תאריך סגירה', type: 'date', typeLabel: 'תאריך', required: false, placeholder: 'טרם נסגר' },
    { ...commonField, id: 'extraNotes', group: 'room', name: 'שדות נוספים', type: 'longtext', typeLabel: 'טקסט חופשי', required: false, placeholder: 'ערך נוסף', showInRow: false }
];

export const widthOptions = ['רוחב מלא', 'חצי רוחב', 'שליש רוחב'];

export const defaultGeneralSettings = {
    defaultPriority: 'נמוכה-3',
    duplicateWarning: 'פעילה',
    automaticAssignmentEnabled: false,
    closeSound: 'off',
    inquiriesPerPage: 7,
    userAssignmentEnabled: true,
    numberFormat: 'M-YY-מספר',
    scopeMode: 'local',
    incidentDescription: { ...defaultIncidentDescriptionSettings },
    incidentDescriptionTemplates: defaultIncidentDescriptionTemplates.map((template) => ({ ...template }))
};

export const isCanonicalIncidentDescriptionField = (field) => field?.key === 'incidentDescription' || field?.role === 'incident-description';

const fieldWidthForSection = (field) => isCanonicalIncidentDescriptionField(field) ? 'רוחב מלא' : (field.width || 'חצי רוחב');

export const createDefaultSections = (fields = defaultInquiryFields) => {
    const activeFields = fields.filter((field) => field.visible !== false);
    const criticalIds = new Set(['priority', 'customerId', 'phone', 'handler']);
    const descriptionIds = new Set(activeFields.filter(isCanonicalIncidentDescriptionField).map((field) => field.id));
    const critical = activeFields.filter((field) => criticalIds.has(field.id));
    const description = activeFields.filter((field) => descriptionIds.has(field.id));
    const details = activeFields.filter((field) => !criticalIds.has(field.id) && !descriptionIds.has(field.id) && field.group === 'system');
    const room = activeFields.filter((field) => !criticalIds.has(field.id) && !descriptionIds.has(field.id) && field.group !== 'system');

    return [
        { id: 'critical', title: 'מידע קריטי', fields: critical.map((field) => ({ id: field.id, visible: field.showInDetails !== false, width: fieldWidthForSection(field) })) },
        { id: 'details', title: 'מידע מערכת', fields: details.map((field) => ({ id: field.id, visible: field.showInDetails !== false, width: fieldWidthForSection(field) })) },
        { id: 'description', title: 'תיאור הפנייה', fields: description.map((field) => ({ id: field.id, visible: field.showInDetails !== false, width: 'רוחב מלא' })) },
        { id: 'room', title: 'שדות חדר', fields: room.map((field) => ({ id: field.id, visible: field.showInDetails !== false, width: fieldWidthForSection(field) })) }
    ].filter((section) => section.fields.length);
};

export const createDefaultSettings = () => {
    const fields = defaultInquiryFields.map(cloneField);
    return {
        schemaVersion: 4,
        roomId: null,
        scope: { level: 'room', inheritedFrom: 'subEnvironment', mode: 'local' },
        fields,
        tableFields: fields.filter((field) => field.showInRow !== false).slice(0, 6).map((field) => field.id),
        sections: createDefaultSections(fields),
        general: {
            ...defaultGeneralSettings,
            incidentDescription: { ...defaultIncidentDescriptionSettings },
            incidentDescriptionTemplates: defaultIncidentDescriptionTemplates.map((template) => ({ ...template }))
        },
        updatedAt: 0
    };
};

export const cloneSettingsField = cloneField;
export const cloneIncidentDescriptionTemplate = (template) => ({ ...template });
export const summarizeIncidentTemplate = (content, title = '') => {
    const normalizedTitle = String(title || '').trim();
    if (normalizedTitle) return normalizedTitle.length > 60 ? `${normalizedTitle.slice(0, 57)}...` : normalizedTitle;
    const normalized = String(content || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).find(Boolean) || '';
    if (!normalized) return 'תבנית חדשה';
    return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
};
