const EVENT_NAME = 'tamar:toast';
const recent = new Map();

const now = () => Date.now();

const canEmit = (type, title, message) => {
    const key = `${type}|${title || ''}|${message || ''}`;
    const last = recent.get(key) || 0;
    const current = now();
    recent.set(key, current);

    if (recent.size > 100) {
        for (const [candidate, timestamp] of recent) {
            if (current - timestamp > 10000) recent.delete(candidate);
        }
    }

    return current - last > 900;
};

export const notify = ({
    type = 'success',
    title = '',
    message = '',
    duration = 4500
} = {}) => {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return null;

    const safeType = type === 'error' ? 'error' : 'success';
    const safeTitle = String(title || (safeType === 'error' ? 'שגיאה' : 'הצלחה')).trim();
    const safeMessage = String(message || '').trim();
    const safeDuration = Math.max(1800, Math.min(Number(duration) || 4500, 12000));

    if (!canEmit(safeType, safeTitle, safeMessage)) return null;

    const id = globalThis.crypto?.randomUUID?.()
        || `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: {
            id,
            type: safeType,
            title: safeTitle,
            message: safeMessage,
            duration: safeDuration
        }
    }));

    return id;
};

export const notifySuccess = (message, options = {}) => notify({
    type: 'success',
    title: options.title || 'הפעולה הושלמה',
    message,
    duration: options.duration
});

export const notifyError = (message, options = {}) => notify({
    type: 'error',
    title: options.title || 'הפעולה נכשלה',
    message: message || 'אירעה שגיאה. נסו שוב.',
    duration: options.duration || 5200
});

export const subscribeToNotifications = (listener) => {
    if (typeof window === 'undefined') return () => {};

    const handler = (event) => {
        if (event?.detail) listener(event.detail);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
};
