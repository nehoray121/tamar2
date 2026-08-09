export const INQUIRY_RUNTIME_STATE = Object.freeze({
    AUTH_LOADING: 'auth_loading',
    AUTH_ERROR: 'auth_error',
    CONTEXT_ERROR: 'context_error',
    INITIAL_LOADING: 'initial_loading',
    API_ERROR: 'api_error',
    EMPTY: 'empty',
    FILTERED_EMPTY: 'filtered_empty',
    READY: 'ready',
    STALE: 'stale'
});

export const deriveInquiryRuntimeState = ({
    taskView = false,
    boardType,
    authStatus,
    authError,
    roomId,
    roomName,
    loaded = false,
    loading = false,
    refreshing = false,
    error = null,
    itemCount = 0,
    hasActiveFilters = false
} = {}) => {
    if (!taskView && !boardType) {
        return {
            kind: INQUIRY_RUNTIME_STATE.CONTEXT_ERROR,
            blocking: true,
            title: 'התצוגה אינה זמינה',
            message: 'התצוגה הנוכחית אינה ממופה ללוח פניות נתמך.'
        };
    }
    if (authStatus === 'initializing') {
        return {
            kind: INQUIRY_RUNTIME_STATE.AUTH_LOADING,
            blocking: true,
            title: 'מאמתים את ההתחברות הארגונית',
            message: 'המערכת טוענת את ההרשאות ואת מבנה הארגון.'
        };
    }
    if (authStatus !== 'authenticated') {
        return {
            kind: INQUIRY_RUNTIME_STATE.AUTH_ERROR,
            blocking: true,
            title: 'לא ניתן לאמת את ההתחברות',
            message: authError || 'לא נמצא חיבור SSO ארגוני פעיל.',
            action: 'retry_auth'
        };
    }
    if (!roomId) {
        return {
            kind: INQUIRY_RUNTIME_STATE.CONTEXT_ERROR,
            blocking: true,
            title: 'לא נבחר חדר ארגוני',
            message: 'יש לבחור חדר פעיל מתוך המבנה הארגוני לפני טעינת לוח הפניות.',
            action: 'select_room'
        };
    }
    if (loading && !loaded) {
        return {
            kind: INQUIRY_RUNTIME_STATE.INITIAL_LOADING,
            blocking: true,
            title: taskView ? 'טוענים את המשימות שלי' : `טוענים את לוח ${roomName || 'החדר'}`,
            message: taskView ? 'המשימות נטענות מהשרת לפי המשתמש המחובר.' : 'הפניות והקטגוריות נטענות מהשרת.'
        };
    }
    if (error?.authorization || error?.code === 'AUTH_TOKEN_UNAVAILABLE') {
        return {
            kind: INQUIRY_RUNTIME_STATE.AUTH_ERROR,
            blocking: true,
            title: error.code === 'AUTH_TOKEN_UNAVAILABLE' ? 'ההתחברות הארגונית אינה זמינה' : error.status === 401 ? 'תוקף ההתחברות פג' : 'אין הרשאה ללוח זה',
            message: error.message,
            requestId: error.requestId,
            action: error.code === 'AUTH_TOKEN_UNAVAILABLE' || error.status === 401 ? 'retry_auth' : 'select_room'
        };
    }
    if (error && !loaded) {
        return {
            kind: INQUIRY_RUNTIME_STATE.API_ERROR,
            blocking: true,
            title: taskView ? 'לא ניתן לטעון את המשימות שלי' : 'לא ניתן לטעון את לוח הפניות',
            message: error.message,
            requestId: error.requestId,
            action: 'retry_board'
        };
    }
    if (!loaded) {
        return {
            kind: INQUIRY_RUNTIME_STATE.INITIAL_LOADING,
            blocking: true,
            title: taskView ? 'טוענים את המשימות שלי' : `טוענים את לוח ${roomName || 'החדר'}`,
            message: taskView ? 'המשימות נטענות מהשרת לפי המשתמש המחובר.' : 'הפניות והקטגוריות נטענות מהשרת.'
        };
    }
    if (error) {
        return {
            kind: INQUIRY_RUNTIME_STATE.STALE,
            blocking: false,
            title: 'הרענון האחרון נכשל',
            message: error.message,
            requestId: error.requestId,
            action: 'retry_board'
        };
    }
    if (itemCount === 0) {
        return {
            kind: hasActiveFilters ? INQUIRY_RUNTIME_STATE.FILTERED_EMPTY : INQUIRY_RUNTIME_STATE.EMPTY,
            blocking: false,
            title: hasActiveFilters ? (taskView ? 'אין משימות התואמות למסננים' : 'אין פניות התואמות למסננים') : (taskView ? 'אין משימות פעילות' : 'אין פניות בלוח זה'),
            message: hasActiveFilters
                ? 'אפשר לשנות או לנקות את המסננים כדי להציג תוצאות נוספות.'
                : taskView ? 'לא נמצאו משימות אישיות פתוחות.' : `לא נמצאו פניות בלוח של ${roomName || 'החדר הנבחר'}.`
        };
    }
    return {
        kind: INQUIRY_RUNTIME_STATE.READY,
        blocking: false,
        refreshing
    };
};
