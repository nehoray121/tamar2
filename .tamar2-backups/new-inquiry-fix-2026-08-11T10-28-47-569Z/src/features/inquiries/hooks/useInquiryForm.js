import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { defaultIncidentDescriptionSettings, defaultIncidentDescriptionTemplates, isCanonicalIncidentDescriptionField } from '../../settings/constants/settingsDefaults.js';
import { settingsRepository } from '../../settings/services/settingsRepository.js';
import { ticketMessagesApi } from '../../tickets/chat/api/ticketMessagesApi.js';
import { ticketsApi } from '../../tickets/api/ticketsApi.js';
import { buildInquiryDraftKey, inquiryDraftRepository } from '../services/inquiryDraftRepository.js';
import { personalAssignmentService } from '../../tickets/services/personalAssignmentService.js';

const baseInitialFields = {
    personalId: '',
    customerName: '',
    phone: '',
    priority: 'נמוכה-3',
    description: '',
    treatmentMode: '',
    location: '',
    handler: '',
    extraRequired: '',
    extraOptional: ''
};

const priorityValues = Object.freeze({
    'גבוהה-1': 'HIGH',
    'בינונית-2': 'MEDIUM',
    'נמוכה-3': 'LOW'
});

const priorityLabels = Object.freeze({
    CRITICAL: 'גבוהה',
    HIGH: 'גבוהה',
    MEDIUM: 'בינונית',
    LOW: 'נמוכה'
});

const handledSettingsFieldIds = new Set([
    'priority', 'handler', 'customerId', 'treatment', 'description', 'location', 'phone', 'status',
    'openDate', 'closingDate'
]);

const isNewInquiryVisibleField = (field) => (
    field?.active !== false &&
    field?.visible !== false &&
    field?.showInNewInquiry !== false &&
    !handledSettingsFieldIds.has(field.id)
);

const buildEnvironmentOptions = (hierarchy) => hierarchy.environments.map((environment) => ({
    ...environment,
    subEnvironments: hierarchy.subEnvironments
        .filter((subEnvironment) => subEnvironment.environmentId === environment.id)
        .map((subEnvironment) => ({
            ...subEnvironment,
            rooms: hierarchy.rooms.filter((room) => room.subEnvironmentId === subEnvironment.id)
        }))
}));

const getCanonicalIncidentDescriptionField = (settingsFields) => settingsFields.find((field) => isCanonicalIncidentDescriptionField(field) || field.id === 'description');

const normalizeIncidentDescriptionSettings = (generalSettings, settingsFields) => {
    const canonicalField = getCanonicalIncidentDescriptionField(settingsFields);

    return {
        ...defaultIncidentDescriptionSettings,
        ...(canonicalField ? {
            label: canonicalField.name || defaultIncidentDescriptionSettings.label,
            placeholder: canonicalField.placeholder || defaultIncidentDescriptionSettings.placeholder,
            required: canonicalField.required ?? defaultIncidentDescriptionSettings.required
        } : {}),
        ...(generalSettings?.incidentDescription || {}),
        label: String(generalSettings?.incidentDescription?.label || canonicalField?.name || defaultIncidentDescriptionSettings.label).trim() || defaultIncidentDescriptionSettings.label,
        placeholder: String(generalSettings?.incidentDescription?.placeholder || canonicalField?.placeholder || defaultIncidentDescriptionSettings.placeholder).trim() || defaultIncidentDescriptionSettings.placeholder,
        helpText: String(generalSettings?.incidentDescription?.helpText || '').trim(),
        required: generalSettings?.incidentDescription?.required ?? canonicalField?.required ?? defaultIncidentDescriptionSettings.required
    };
};

const normalizeTemplates = (generalSettings) => {
    const templates = Array.isArray(generalSettings?.incidentDescriptionTemplates) && generalSettings.incidentDescriptionTemplates.length
        ? generalSettings.incidentDescriptionTemplates
        : defaultIncidentDescriptionTemplates;

    return templates
        .filter((template) => template?.enabled !== false)
        .map((template) => ({
            id: String(template?.id || '').trim(),
            title: String(template?.title || '').trim(),
            content: String(template?.content || '').replace(/\r/g, '').trim()
        }))
        .filter((template) => template.id && template.content);
};

const getInitialFields = (dynamicFields, generalSettings, roomName = '') => {
    const values = {
        ...baseInitialFields,
        priority: generalSettings?.defaultPriority || baseInitialFields.priority,
        handler: roomName
    };
    dynamicFields.forEach((field) => {
        values[field.id] = '';
    });
    return values;
};

const toHistoryItem = (ticket) => ({
    id: ticket.ticketNumber || String(ticket.id),
    status: ticket.status === 'CLOSED' ? 'סגורה' : 'פתוחה',
    priority: priorityLabels[ticket.priority] || 'בינונית',
    description: ticket.description || ticket.subject || 'ללא תיאור'
});

const createClientMessageId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    throw new Error('הדפדפן אינו תומך ביצירת מזהה הודעה מאובטח.');
};

export function useInquiryForm() {
    const currentUser = useSessionStore((state) => state.currentUser);
    const sessionEnvironment = useSessionStore((state) => state.selectedEnvironment);
    const sessionRoom = useSessionStore((state) => state.selectedRoom);
    const hierarchy = useSessionStore((state) => state.organizationHierarchy);
    const navigate = useSessionStore((state) => state.navigate);
    const environments = useMemo(() => buildEnvironmentOptions(hierarchy), [hierarchy]);

    const [activeTab, setActiveTab] = useState('form');
    const [settingsFields, setSettingsFields] = useState([]);
    const [generalSettings, setGeneralSettings] = useState({});
    const dynamicFields = useMemo(() => settingsFields.filter(isNewInquiryVisibleField), [settingsFields]);
    const incidentDescriptionSettings = useMemo(() => normalizeIncidentDescriptionSettings(generalSettings, settingsFields), [generalSettings, settingsFields]);
    const templates = useMemo(() => normalizeTemplates(generalSettings), [generalSettings]);
    const dynamicFieldKey = useMemo(() => dynamicFields.map((field) => `${field.id}:${field.type}:${field.required ? '1' : '0'}:${field.parentId || ''}:${(field.options || []).join(',')}`).join('|'), [dynamicFields]);
    const [fields, setFields] = useState(() => getInitialFields([], {}));
    const [environmentId, setEnvironmentIdState] = useState(sessionEnvironment?.id || '');
    const [subEnvironmentId, setSubEnvironmentIdState] = useState(sessionRoom?.subEnvironmentId || '');
    const [roomId, setRoomIdState] = useState(sessionRoom?.id || '');
    const [createdTicket, setCreatedTicket] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [openCustomerInquiries, setOpenCustomerInquiries] = useState([]);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [draftNotice, setDraftNotice] = useState('');
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [settingsLoadError, setSettingsLoadError] = useState(null);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [draftLoadError, setDraftLoadError] = useState(null);
    const [loadRevision, setLoadRevision] = useState(0);
    const [assignmentRevision, setAssignmentRevision] = useState(0);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [chatDraft, setChatDraft] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [publishing, setPublishing] = useState(false);
    const draftReadyRef = useRef(false);
    const saveRevisionRef = useRef(0);

    useEffect(() => {
        const canonicalRoom = hierarchy.rooms.find((room) => room.id === roomId)
            || hierarchy.rooms.find((room) => room.id === sessionRoom?.id)
            || hierarchy.rooms[0];
        if (!canonicalRoom) return;
        setRoomIdState(canonicalRoom.id);
        setSubEnvironmentIdState(canonicalRoom.subEnvironmentId);
        setEnvironmentIdState(canonicalRoom.environmentId);
    }, [hierarchy.rooms, roomId, sessionRoom?.id]);

    const selectedEnvironment = environments.find((item) => item.id === environmentId) || null;
    const selectedSubEnvironment = selectedEnvironment?.subEnvironments.find((item) => item.id === subEnvironmentId) || null;
    const selectedRoom = selectedSubEnvironment?.rooms.find((item) => item.id === roomId) || null;
    const currentRoomName = selectedRoom?.name || sessionRoom?.name || '';
    const ticketId = createdTicket?.id || '';
    const inquiryId = createdTicket?.ticketNumber || 'טרם הוקצה';
    const assignmentEnabled = generalSettings.userAssignmentEnabled !== false;
    const assignmentReady = Boolean(ticketId);
    const currentUserId = String(currentUser?.id || 'anonymous');

    useEffect(() => {
        if (!roomId) return undefined;
        let alive = true;
        setSettingsLoaded(false);
        setSettingsLoadError(null);
        settingsRepository.load(roomId).then((result) => {
            if (!alive) return;
            setSettingsFields(result.settings.fields || []);
            setGeneralSettings(result.settings.general || {});
            setSettingsLoaded(true);
        }).catch((error) => {
            if (!alive) return;
            setSettingsLoadError(error);
        });
        return () => {
            alive = false;
        };
    }, [loadRevision, roomId]);

    const draftKey = useMemo(() => buildInquiryDraftKey({
        userId: currentUserId,
        environmentId,
        subEnvironmentId,
        roomId
    }), [currentUserId, environmentId, roomId, subEnvironmentId]);

    useEffect(() => {
        if (!settingsLoaded || !roomId) return undefined;
        let alive = true;
        draftReadyRef.current = false;
        setDraftLoaded(false);
        setDraftLoadError(null);
        const defaults = getInitialFields(dynamicFields, generalSettings, currentRoomName);

        inquiryDraftRepository.load(draftKey).then((draft) => {
            if (!alive) return;
            if (draft?.payload?.fields) {
                setFields({ ...defaults, ...draft.payload.fields, handler: draft.payload.fields.handler || currentRoomName });
                setChatDraft(draft.payload.chatDraft || '');
                setChatMessages(Array.isArray(draft.payload.chatMessages) ? draft.payload.chatMessages : []);
                setDraftNotice('טיוטה שוחזרה');
            } else {
                setFields(defaults);
                setChatDraft('');
                setChatMessages([]);
                setDraftNotice('');
            }
            draftReadyRef.current = true;
            setDraftLoaded(true);
        }).catch((error) => {
            if (!alive) return;
            setDraftLoadError(error);
        });

        return () => {
            alive = false;
        };
    }, [currentRoomName, draftKey, dynamicFieldKey, generalSettings.defaultPriority, loadRevision, roomId, settingsLoaded]);

    useEffect(() => {
        if (!isHistoryOpen || !fields.personalId.trim()) {
            setOpenCustomerInquiries([]);
            return undefined;
        }
        const controller = new AbortController();
        ticketsApi.list({
            view: 'OPEN',
            page: 1,
            limit: 100,
            customerId: fields.personalId.trim(),
            sortBy: 'updatedAt',
            sortDirection: 'desc'
        }, { signal: controller.signal }).then((response) => {
            setOpenCustomerInquiries((response.data?.items || []).map(toHistoryItem));
        }).catch((error) => {
            if (error?.name !== 'AbortError') setOpenCustomerInquiries([]);
        });
        return () => controller.abort();
    }, [fields.personalId, isHistoryOpen]);

    useEffect(() => {
        if (!assignmentEnabled) {
            setAssignedUsers([]);
            return undefined;
        }
        let alive = true;
        personalAssignmentService.getAssignment(ticketId).then((record) => {
            if (alive) setAssignedUsers(record?.assignedUsers || []);
        }).catch(() => {
            if (alive) setAssignedUsers([]);
        });
        return () => {
            alive = false;
        };
    }, [assignmentEnabled, assignmentRevision, ticketId]);

    useEffect(() => {
        if (!draftNotice) return undefined;
        const timer = window.setTimeout(() => setDraftNotice(''), 2600);
        return () => window.clearTimeout(timer);
    }, [draftNotice]);

    useEffect(() => {
        if (!draftReadyRef.current) return undefined;
        const revision = saveRevisionRef.current + 1;
        saveRevisionRef.current = revision;
        const updatedAt = Date.now();
        const timer = window.setTimeout(() => {
            inquiryDraftRepository.save(draftKey, {
                context: { userId: currentUserId, environmentId, subEnvironmentId, roomId },
                fields,
                chatDraft,
                chatMessages
            }, updatedAt).catch(() => {
                if (saveRevisionRef.current === revision) setDraftNotice('שגיאה בשמירת טיוטה');
            });
        }, 450);
        return () => window.clearTimeout(timer);
    }, [chatDraft, chatMessages, currentUserId, draftKey, environmentId, fields, roomId, subEnvironmentId]);

    const requiredKeys = useMemo(() => {
        const keys = ['personalId', 'customerName', 'phone', 'priority', 'handler'];
        if (incidentDescriptionSettings.required) keys.splice(4, 0, 'description');
        dynamicFields.filter((field) => field.required).forEach((field) => keys.push(field.id));
        return keys;
    }, [dynamicFields, incidentDescriptionSettings.required]);

    const requiredDone = useMemo(() => requiredKeys.filter((key) => {
        const value = fields[key];
        return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim();
    }).length, [fields, requiredKeys]);
    const assignedUsersSummary = useMemo(() => assignedUsers.map((user) => user.name).join(', '), [assignedUsers]);

    const setField = (name, value) => {
        setFields((current) => {
            const next = { ...current, [name]: value };
            dynamicFields.forEach((field) => {
                if (field.parentId !== name) return;
                const allowedOptions = value ? (field.dependencyMap?.[value] || []) : [];
                const childValue = next[field.id];
                if (!value || (childValue && allowedOptions.length && !allowedOptions.includes(childValue))) {
                    next[field.id] = '';
                }
            });
            return next;
        });
    };

    const setEnvironmentId = (nextEnvironmentId) => {
        const nextEnvironment = environments.find((item) => item.id === nextEnvironmentId);
        if (!nextEnvironment) return;
        const nextSubEnvironment = nextEnvironment.subEnvironments[0] || null;
        setEnvironmentIdState(nextEnvironment.id);
        setSubEnvironmentIdState(nextSubEnvironment?.id || '');
        setRoomIdState(nextSubEnvironment?.rooms[0]?.id || '');
    };

    const setSubEnvironmentId = (nextSubEnvironmentId) => {
        const nextSubEnvironment = selectedEnvironment?.subEnvironments.find((item) => item.id === nextSubEnvironmentId);
        if (!nextSubEnvironment) return;
        setSubEnvironmentIdState(nextSubEnvironment.id);
        setRoomIdState(nextSubEnvironment.rooms[0]?.id || '');
    };

    const setRoomId = (nextRoomId) => setRoomIdState(nextRoomId);

    const selectTemplate = (template) => {
        const templateText = typeof template === 'string' ? template : template?.content;
        if (!templateText) return;
        setField('description', fields.description ? `${fields.description}\n${templateText}` : templateText);
        setIsTemplateOpen(false);
    };

    const sendChatMessage = () => {
        const text = chatDraft.trim();
        if (!text) return;
        setChatMessages((current) => [
            ...current,
            {
                id: createClientMessageId(),
                author: currentUser?.displayName || 'המשתמש המחובר',
                time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
                text
            }
        ]);
        setChatDraft('');
    };

    const resetFormContent = async () => {
        await inquiryDraftRepository.clear(draftKey);
        setFields(getInitialFields(dynamicFields, generalSettings, currentRoomName));
        setChatDraft('');
        setChatMessages([]);
        setDraftNotice('');
        setIsClearConfirmOpen(false);
    };

    const publishInquiry = async () => {
        if (publishing) return null;
        if (!roomId || requiredDone < requiredKeys.length) {
            setDraftNotice('יש להשלים את כל שדות החובה לפני הפרסום');
            return null;
        }
        setPublishing(true);
try {
    if (
        generalSettings.duplicateWarning === 'פעילה'
        && fields.personalId.trim()
    ) {
        const duplicateResponse = await ticketsApi.list({
            view: 'OPEN',
            page: 1,
            limit: 5,
            roomId,
            customerId: fields.personalId.trim(),
            sortBy: 'updatedAt',
            sortDirection: 'desc'
        });
        const duplicates = duplicateResponse.data?.items || [];
        if (
            duplicates.length > 0
            && !window.confirm(
                `קיימות ${duplicates.length} פניות פתוחות ללקוח זה בחדר. להמשיך וליצור פנייה נוספת?`
            )
        ) {
            setDraftNotice('יצירת הפנייה בוטלה בעקבות זיהוי כפילות');
            return null;
        }
    }

    const dynamicValues = Object.fromEntries(dynamicFields.map((field) => [field.id, fields[field.id] ?? '']));
    const response = await ticketsApi.create({

                roomId,
                subject: fields.customerName.trim() ? `פנייה עבור ${fields.customerName.trim()}` : fields.description.trim().slice(0, 200),
                description: fields.description.trim(),
                priority: priorityValues[fields.priority] || 'MEDIUM',
                fieldValues: {
                    ...dynamicValues,
                    customerId: fields.personalId.trim(),
                    customerName: fields.customerName.trim(),
                    phone: fields.phone.trim(),
                    treatment: fields.treatmentMode || '',
                    location: fields.location || '',
                    handler: fields.handler || currentRoomName
                }
            });
            const ticket = response.data;
            setCreatedTicket(ticket);
            const pendingMessages = [...chatMessages];
            if (chatDraft.trim()) {
                pendingMessages.push({ id: createClientMessageId(), text: chatDraft.trim() });
            }
            await Promise.allSettled(pendingMessages.map((message) => ticketMessagesApi.createTicketMessage({
                ticketId: ticket.id,
                clientMessageId: message.id,
                content: message.text
            })));
            await inquiryDraftRepository.clear(draftKey);
            setFields(getInitialFields(dynamicFields, generalSettings, currentRoomName));
            setChatDraft('');
            setChatMessages([]);
            setIsPublishConfirmOpen(false);
            navigate('open_complaints');
            return ticket;
        } catch (error) {
            setDraftNotice(error?.message || 'לא ניתן לפרסם את הפנייה כעת');
            return null;
        } finally {
            setPublishing(false);
        }
    };

    const refreshAssignment = () => setAssignmentRevision((revision) => revision + 1);
    const initialLoading = !roomId || !settingsLoaded || !draftLoaded;
    const initialLoadError = settingsLoadError || draftLoadError;
    const reloadInitialData = () => setLoadRevision((revision) => revision + 1);

    const openChat = () => setActiveTab('chat');
    const closeChat = () => setActiveTab('form');
    const openAssignment = () => assignmentEnabled && setActiveTab('assignment');
    const closeAssignment = () => setActiveTab('form');

    return {
        initialLoading,
        initialLoadError,
        reloadInitialData,
        activeTab,
        setActiveTab,
        openChat,
        closeChat,
        openAssignment,
        closeAssignment,
        inquiryId,
        ticketId,
        currentUser,
        currentRoomName,
        fields,
        dynamicFields,
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
        requiredTotal: requiredKeys.length,
        optionalTotal: dynamicFields.length + 2,
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
        isClearConfirmOpen,
        setIsClearConfirmOpen,
        resetFormContent,
        publishInquiry,
        publishing,
        draftNotice,
        draftKey,
        assignmentEnabled,
        assignmentReady,
        assignedUsers,
        assignedUsersSummary,
        refreshAssignment,
        generalSettings,
        incidentDescriptionSettings,
        chatDraft,
        setChatDraft,
        chatMessages,
        sendChatMessage
    };
}