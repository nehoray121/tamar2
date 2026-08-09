const safeMessages = Object.freeze({
    AUTH_TOKEN_UNAVAILABLE: 'לא ניתן לקבל אסימון SSO מאובטח כרגע. יש להתחבר מחדש למערכת.',
    AUTHENTICATION_REQUIRED: 'נדרש אימות מחדש כדי להמשיך. יש להתחבר שוב למערכת.',
    TICKET_NOT_FOUND: 'הפנייה אינה זמינה או שאין לך הרשאה לצפות בה.',
    MESSAGE_NOT_FOUND: 'ההודעה אינה זמינה עוד.',
    MESSAGE_NOT_AUTHORED_BY_ACTOR: 'ניתן לערוך או למחוק רק הודעה ששלחת.',
    MESSAGE_CANNOT_EDIT_DELETED: 'לא ניתן לערוך הודעה שנמחקה.',
    MESSAGE_ALREADY_DELETED: 'ההודעה כבר נמחקה. השיחה רועננה.',
    MESSAGE_IDEMPOTENCY_CONFLICT: 'לא ניתן להשתמש באותו מזהה שליחה עבור תוכן שונה.',
    MESSAGE_VERSION_CONFLICT: 'ההודעה השתנתה במקביל. השיחה רועננה והטיוטה שלך נשמרה.',
    INVALID_MESSAGE_CONTENT: 'תוכן ההודעה אינו תקין.',
    INVALID_CLIENT_MESSAGE_ID: 'מזהה השליחה אינו תקין. נסה שוב.',
    INVALID_MESSAGE_CURSOR: 'נקודת הטעינה אינה תקינה. רענן את השיחה ונסה שוב.',
    EMPTY_MESSAGE_UPDATE: 'לא התקבל תוכן חדש לעדכון.',
    PRECONDITION_REQUIRED: 'חסרה גרסת ההודעה. השיחה רועננה וניתן לנסות שוב.',
    VALIDATION_ERROR: 'חלק מנתוני הבקשה אינם תקינים. בדוק את התוכן ונסה שוב.',
    CHAT_ACCESS_FORBIDDEN: 'אין לך הרשאה לצפות בשיחה של פנייה זו.',
    CHAT_SCOPE_INACTIVE: 'אחד מהחדרים המשתתפים בשיחה אינו פעיל.'
});

const accessLossCodes = new Set([
    'TICKET_NOT_FOUND',
    'CHAT_ACCESS_FORBIDDEN',
    'CHAT_SCOPE_INACTIVE'
]);

const conflictCodes = new Set([
    'MESSAGE_VERSION_CONFLICT',
    'MESSAGE_ALREADY_DELETED',
    'MESSAGE_CANNOT_EDIT_DELETED',
    'PRECONDITION_REQUIRED'
]);

export const classifyTicketMessageError = (error, fallback = 'לא ניתן להשלים את פעולת הצ׳אט.') => ({
    code: error?.code || 'CHAT_REQUEST_FAILED',
    status: Number(error?.status) || 0,
    requestId: error?.requestId || null,
    message: safeMessages[error?.code]
        || (Number(error?.status) >= 500 ? 'אירעה תקלה זמנית בשירות הצ׳אט. נסה שוב.' : fallback),
    authentication: error?.code === 'AUTH_TOKEN_UNAVAILABLE' || Number(error?.status) === 401,
    accessLost: accessLossCodes.has(error?.code) || Number(error?.status) === 403 || Number(error?.status) === 404,
    conflict: conflictCodes.has(error?.code) || Number(error?.status) === 409 || Number(error?.status) === 428,
    retryable: Number(error?.status) === 0 || Number(error?.status) >= 500
});

export const isMessageConflict = (error) => classifyTicketMessageError(error).conflict;
