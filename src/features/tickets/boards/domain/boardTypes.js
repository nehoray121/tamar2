export const BOARD_TYPES = Object.freeze({
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    EXTERNAL_SENT: 'EXTERNAL_SENT',
    EXTERNAL_RECEIVED: 'EXTERNAL_RECEIVED'
});

export const BOARD_TYPE_VALUES = Object.freeze(Object.values(BOARD_TYPES));

export const BOARD_LABELS = Object.freeze({
    [BOARD_TYPES.OPEN]: 'פניות פתוחות',
    [BOARD_TYPES.CLOSED]: 'פניות סגורות',
    [BOARD_TYPES.EXTERNAL_SENT]: 'פניות חיצוניות שנשלחו',
    [BOARD_TYPES.EXTERNAL_RECEIVED]: 'פניות חיצוניות שהתקבלו'
});

export const isBoardType = (value) => BOARD_TYPE_VALUES.includes(value);
export const isExternalBoard = (value) => value === BOARD_TYPES.EXTERNAL_SENT || value === BOARD_TYPES.EXTERNAL_RECEIVED;

export const resolveBoardTypeFromView = ({ viewType, toggleState } = {}) => {
    if (viewType === 'open') return BOARD_TYPES.OPEN;
    if (viewType === 'history' || viewType === 'closed') return BOARD_TYPES.CLOSED;
    if (viewType !== 'external') return null;
    if (toggleState === 'sent') return BOARD_TYPES.EXTERNAL_SENT;
    if (toggleState === 'received') return BOARD_TYPES.EXTERNAL_RECEIVED;
    return null;
};

export const requireBoardType = (value) => {
    if (!isBoardType(value)) throw new TypeError(`Unsupported board type: ${String(value)}`);
    return value;
};
