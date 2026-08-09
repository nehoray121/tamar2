import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const controlClass = 'inquiry-input-surface h-9 w-full rounded-lg px-3 text-right text-[12px] font-bold outline-none';

const fieldValue = (value) => {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
};

const InquiryFormField = ({
    field,
    value,
    editable = false,
    preview = false,
    hideLabel = false,
    onChange
}) => {
    const displayValue = fieldValue(value);
    const placeholder = field.placeholder || field.name;
    const update = (nextValue) => onChange?.(field.id, nextValue);
    const commonProps = editable
        ? { defaultValue: displayValue, onChange: (event) => update(event.target.value) }
        : { value: displayValue, readOnly: true };

    const label = hideLabel ? null : (
        <label className="mb-1 block truncate text-right text-[12px] font-black text-[var(--color-text-primary)]" dir="auto">
            {field.name}
            {field.required && <span className="mr-1 text-red-400">*</span>}
        </label>
    );

    if (field.type === 'longtext') {
        return (
            <div className="min-w-0" data-inquiry-field-content={field.id}>
                {label}
                <textarea
                    {...commonProps}
                    tabIndex={preview ? -1 : undefined}
                    aria-label={field.name}
                    placeholder={placeholder}
                    className="inquiry-input-surface min-h-[76px] w-full resize-none rounded-lg px-3 py-2 text-right text-[12px] font-semibold leading-5 outline-none"
                />
            </div>
        );
    }

    if (field.type === 'select' || field.type === 'multiselect' || field.type === 'user') {
        if (editable && field.type !== 'multiselect') {
            return (
                <div className="min-w-0" data-inquiry-field-content={field.id}>
                    {label}
                    <select
                        value={displayValue}
                        onChange={(event) => update(event.target.value)}
                        aria-label={field.name}
                        className={`${controlClass} appearance-none`}
                    >
                        <option value="">{placeholder}</option>
                        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
            );
        }

        return (
            <div className="min-w-0" data-inquiry-field-content={field.id}>
                {label}
                <div className={`${controlClass} flex items-center justify-between gap-2 text-[var(--color-text-secondary)]`}>
                    <span className="truncate" dir="auto">{displayValue || placeholder}</span>
                    <Icon name="chevronDown" className="h-3.5 w-3.5 shrink-0" />
                </div>
            </div>
        );
    }

    if (field.type === 'link') {
        return (
            <div className="min-w-0" data-inquiry-field-content={field.id}>
                {label}
                <div className={`${controlClass} flex items-center gap-2 text-[var(--color-primary)]`}>
                    <Icon name="link" className="h-4 w-4 shrink-0" />
                    <span className="truncate">{field.linkConfig?.label || placeholder}</span>
                </div>
            </div>
        );
    }

    const inputType = field.type === 'date' ? 'date' : field.type === 'phone' ? 'tel' : 'text';
    return (
        <div className="min-w-0" data-inquiry-field-content={field.id}>
            {label}
            <div className="relative">
                <input
                    {...commonProps}
                    type={inputType}
                    tabIndex={preview ? -1 : undefined}
                    aria-label={field.name}
                    placeholder={placeholder}
                    className={`${controlClass} pl-9`}
                />
                {(field.type === 'date' || field.type === 'phone') && (
                    <Icon name={field.type === 'date' ? 'calendar' : 'phone'} className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
                )}
            </div>
        </div>
    );
};

export default InquiryFormField;

