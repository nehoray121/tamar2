import { useMemo, useState } from 'react';

const inquiryId = 'M-19-1780831307772';

const environments = [
    {
        id: 'technology',
        name: 'אגף טכנולוגיה',
        subEnvironments: [
            { id: 'ops', name: 'צוות תשתיות', rooms: [{ id: 'manday', name: 'מנדיי' }, { id: 'networks', name: 'רשתות' }] },
            { id: 'support', name: 'מוקד תמיכה', rooms: [{ id: 'service', name: 'שירות לקוחות' }, { id: 'noc', name: 'חדר בקרה' }] }
        ]
    },
    {
        id: 'operations',
        name: 'תפעול ומידע רשתי',
        subEnvironments: [
            { id: 'field', name: 'תפעול שטח', rooms: [{ id: 'control', name: 'חמ״ל תפעול' }, { id: 'reports', name: 'דיווחים' }] }
        ]
    }
];

const templates = [
    'הלקוח מדווח על תקלה חוזרת. נדרש לבדוק זמינות שירותים, לבצע אימות פרטים ולתעד פעולות שבוצעו.',
    'נפתחה פנייה בעקבות בקשת סיוע. יש לשייך נציג מטפל ולעדכן סטטוס לאחר יצירת קשר.',
    'נדרש טיפול המשך מול צוות תשתיות. יש לציין מיקום, גורם מטפל ולצרף פירוט מלא של התקלה.'
];

const openCustomerInquiries = [
    { id: 'M-19-1780831301121', status: 'פתוחה', priority: 'גבוהה', description: 'תקלה חוזרת בגישה למערכת המבצעית.' },
    { id: 'M-19-1780831298840', status: 'בטיפול', priority: 'בינונית', description: 'בקשת עדכון הרשאות ושיוך משתמש.' },
    { id: 'M-19-1780831284427', status: 'פתוחה', priority: 'נמוכה', description: 'בירור סטטוס טיפול בפנייה קודמת.' }
];

const initialFields = {
    personalId: '',
    customerName: '',
    phone: '',
    priority: 'נמוכה-3',
    description: '',
    treatmentMode: '',
    location: '',
    handler: 'מנדיי',
    assignee: '',
    extraRequired: '',
    extraOptional: ''
};

export function useInquiryForm() {
    const [activeTab, setActiveTab] = useState('form');
    const [fields, setFields] = useState(initialFields);
    const [environmentId, setEnvironmentIdState] = useState('technology');
    const [subEnvironmentId, setSubEnvironmentIdState] = useState('ops');
    const [roomId, setRoomId] = useState('manday');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
    const [chatDraft, setChatDraft] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { id: 1, author: 'עטיה נהוראי', time: '12:42', text: 'נפתחה טיוטת פנייה חדשה. ההודעות כאן פנימיות בלבד.' }
    ]);

    const selectedEnvironment = environments.find((item) => item.id === environmentId) ?? environments[0];
    const selectedSubEnvironment = selectedEnvironment.subEnvironments.find((item) => item.id === subEnvironmentId) ?? selectedEnvironment.subEnvironments[0];
    const selectedRoom = selectedSubEnvironment?.rooms.find((item) => item.id === roomId) ?? selectedSubEnvironment?.rooms[0];
    const currentRoomName = selectedRoom?.name ?? 'מנדיי';

    const requiredDone = useMemo(() => {
        return ['personalId', 'customerName', 'phone', 'priority', 'description', 'handler'].filter((key) => String(fields[key] ?? '').trim()).length;
    }, [fields]);

    const setField = (name, value) => {
        setFields((current) => ({ ...current, [name]: value }));
    };

    const setEnvironmentId = (nextEnvironmentId) => {
        const nextEnvironment = environments.find((item) => item.id === nextEnvironmentId) ?? environments[0];
        const nextSubEnvironment = nextEnvironment.subEnvironments[0];
        setEnvironmentIdState(nextEnvironment.id);
        setSubEnvironmentIdState(nextSubEnvironment.id);
        setRoomId(nextSubEnvironment.rooms[0]?.id ?? '');
    };

    const setSubEnvironmentId = (nextSubEnvironmentId) => {
        const nextSubEnvironment = selectedEnvironment.subEnvironments.find((item) => item.id === nextSubEnvironmentId) ?? selectedEnvironment.subEnvironments[0];
        setSubEnvironmentIdState(nextSubEnvironment.id);
        setRoomId(nextSubEnvironment.rooms[0]?.id ?? '');
    };

    const selectTemplate = (template) => {
        setField('description', fields.description ? `${fields.description}\n${template}` : template);
        setIsTemplateOpen(false);
    };

    const sendChatMessage = () => {
        const text = chatDraft.trim();
        if (!text) return;
        setChatMessages((current) => [
            ...current,
            { id: Date.now(), author: 'עטיה נהוראי', time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), text }
        ]);
        setChatDraft('');
    };

    const openChat = () => setActiveTab('chat');
    const closeChat = () => setActiveTab('form');

    return {
        activeTab,
        setActiveTab,
        openChat,
        closeChat,
        inquiryId,
        currentRoomName,
        fields,
        setField,
        environments,
        selectedEnvironment,
        selectedSubEnvironment,
        selectedRoom,
        environmentId,
        setEnvironmentId,
        subEnvironmentId,
        setSubEnvironmentId,
        roomId,
        setRoomId,
        requiredDone,
        requiredTotal: 6,
        optionalTotal: 2,
        templates,
        isTemplateOpen,
        setIsTemplateOpen,
        selectTemplate,
        isHistoryOpen,
        setIsHistoryOpen,
        openCustomerInquiries,
        isShortcutsOpen,
        setIsShortcutsOpen,
        isPublishConfirmOpen,
        setIsPublishConfirmOpen,
        chatDraft,
        setChatDraft,
        chatMessages,
        sendChatMessage
    };
}
