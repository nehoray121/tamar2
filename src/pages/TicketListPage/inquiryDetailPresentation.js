// Read-only presentation; does not mutate source values or configuration.
const icons = Object.freeze({
    priority: 'target', handler: 'users', customerId: 'search', treatment: 'check',
    description: 'list', location: 'location', phone: 'phone', status: 'activity',
    openDate: 'calendar', closingDate: 'calendar', network: 'globe'
});
const typeIcons = Object.freeze({ date: 'calendar', phone: 'phone', user: 'user', link: 'link', longtext: 'list' });

export const detailDisplayValue = (field, value) => {
    if (Array.isArray(value)) return value.map((item) => String(item)).join(', ') || '—';
    if (value === null || value === undefined || value === '') {
        return field.type === 'link' && field.linkConfig?.label ? field.linkConfig.label : '—';
    }
    const text = String(value);
    // Display the calendar date without UTC/local time-zone conversion.
    if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split('-');
        return `${day}/${month}/${year}`;
    }
    return text;
};

export const detailFieldIcon = (field) => icons[field.id] || typeIcons[field.type] || 'filePlus';
