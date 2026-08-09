const conflictCodes = new Set(['BOARD_STATE_VERSION_CONFLICT', 'BOARD_CATEGORY_VERSION_CONFLICT']);

export class BoardApiError extends Error {
    constructor({ message, status = 0, code = 'BOARD_REQUEST_FAILED', requestId = null, fieldErrors = null } = {}) {
        super(message || 'בקשת הלוח נכשלה');
        this.name = 'BoardApiError';
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.fieldErrors = fieldErrors;
        this.conflict = status === 409 || conflictCodes.has(code);
        this.authorization = status === 401 || status === 403;
        this.retryable = status === 0 || status >= 500;
    }
}

const safeMessages = Object.freeze({
    BOARD_STATE_VERSION_CONFLICT: 'הפנייה עודכנה בינתיים על ידי משתמש אחר. הנתונים רועננו וניתן לנסות שוב.',
    BOARD_CATEGORY_VERSION_CONFLICT: 'הקטגוריה עודכנה בינתיים על ידי משתמש אחר. הנתונים רועננו וניתן לנסות שוב.',
    PRECONDITION_REQUIRED: 'גרסת הפריט חסרה. הנתונים ירועננו לפני ניסיון נוסף.',
    BOARD_ITEM_NOT_FOUND: 'הפנייה אינה זמינה עוד בלוח זה.',
    BOARD_ITEM_NOT_ELIGIBLE: 'הפנייה הועברה או שינתה מצב ואינה שייכת עוד ללוח זה.',
    BOARD_CATEGORY_NOT_FOUND: 'הקטגוריה אינה זמינה בלוח זה.',
    BOARD_CATEGORY_ARCHIVED: 'הקטגוריה הועברה לארכיון ואינה זמינה לשיוך חדש.',
    BOARD_CATEGORY_SCOPE_MISMATCH: 'הקטגוריה שייכת לחדר או ללוח אחר.',
    BOARD_CATEGORY_DUPLICATE: 'כבר קיימת קטגוריה בשם זה בלוח הנוכחי.',
    BOARD_ACCESS_FORBIDDEN: 'אין הרשאה לצפות בלוח זה או לשנות אותו.',
    BOARD_SCOPE_INACTIVE: 'החדר או ההיררכיה אינם פעילים כעת.',
    AUTH_TOKEN_UNAVAILABLE: 'לא נמצא Access Token ארגוני פעיל. יש להתחבר מחדש למערכת.'
});

export const toBoardApiError = ({ response, body, cause } = {}) => {
    if (cause instanceof BoardApiError) return cause;
    const error = body?.error || {};
    const code = error.code || (response ? 'BOARD_REQUEST_FAILED' : 'BOARD_NETWORK_ERROR');
    const message = safeMessages[code]
        || (response?.status >= 500 ? 'שירות הלוחות אינו זמין כרגע. נסו שוב.' : 'לא ניתן להשלים את הפעולה בלוח.');
    return new BoardApiError({
        message,
        status: response?.status || 0,
        code,
        requestId: error.requestId || response?.headers?.get?.('x-request-id') || null,
        fieldErrors: error.fieldErrors || error.details?.fieldErrors || null
    });
};
