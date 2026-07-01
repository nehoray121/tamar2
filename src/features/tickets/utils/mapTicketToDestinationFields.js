const defaultAliases = {
    contactPhone: ['phone'],
    customerId: ['room'],
    urgency: ['priority'],
    description: ['description']
};

const isCompatibleValue = (value, type = 'text') => {
    if (value === undefined || value === null) return false;
    if (type === 'text' || type === 'textarea' || type === 'select') return String(value).trim().length > 0;
    return true;
};

const mapTicketToDestinationFields = (ticket, fieldDefinitions) => {
    return fieldDefinitions.reduce((mappedFields, field) => {
        const candidateKeys = [field.sourceKey, field.key, ...(field.aliases ?? defaultAliases[field.key] ?? [])].filter(Boolean);
        const sourceKey = candidateKeys.find((key) => isCompatibleValue(ticket[key], field.type));

        mappedFields[field.key] = {
            value: sourceKey ? ticket[sourceKey] : (field.defaultValue ?? ''),
            prefilled: Boolean(sourceKey),
            sourceKey: sourceKey ?? null
        };

        return mappedFields;
    }, {});
};

export { mapTicketToDestinationFields };
