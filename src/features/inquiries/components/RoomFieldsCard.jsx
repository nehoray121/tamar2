import React, { useMemo } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const fieldBase = 'inquiry-input-surface h-[34px] w-full rounded-lg px-3 text-[12px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.04)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-blue-500';
const LABEL_ROOM_FIELDS = 'שדות חדר';
const LABEL_ENVIRONMENT = 'סביבה';
const LABEL_SUB_ENVIRONMENT = 'תת-סביבה';
const LABEL_ROOM = 'חדר';
const LABEL_REQUIRED = 'שדות חובה';
const LABEL_HANDLER = 'גורם מטפל';
const LABEL_TREATMENT_MODE = 'אופן טיפול בפנייה';
const LABEL_ASSIGNEE = 'שיוך אישי';
const LABEL_LOCATION = 'מיקום';
const LABEL_EXTRA_REQUIRED = 'שדה חדר נוסף (אופציונלי)';
const LABEL_EXTRA_OPTIONAL = 'שדה חדר נוסף 2 (אופציונלי)';
const PLACEHOLDER_HANDLER = 'הכנס/י גורם מטפל';
const PLACEHOLDER_ENTER_TREATMENT = 'הכנס/י אופן טיפול';
const PLACEHOLDER_ENTER_LOCATION = 'הכנס/י מיקום';
const PLACEHOLDER_VALUE = 'ערך';
const LABEL_SELECT_PREFIX = 'בחר';
const PLACEHOLDER_ASSIGNMENT = 'הניהול מתבצע מחלונית השיוך';

const CompactSelect = ({ value, onChange, disabled, options, prefix, className = '' }) => {
    const selectedOption = options.find((option) => option.id === value) ?? options[0];
    const selectedLabel = selectedOption?.name || `${LABEL_SELECT_PREFIX} ${prefix}`;

    return (
        <div className={`min-w-0 ${className}`}>
            <div className="inquiry-input-surface grid h-9 grid-cols-[auto_minmax(0,1fr)_18px] items-center gap-2 rounded-lg px-3 shadow-[0_2px_8px_rgba(37,99,235,0.04)]">
                <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold inquiry-muted-text">{prefix}:</span>
                <div className="relative min-w-0">
                    <span className={`block truncate text-right text-[12px] font-black ${disabled ? 'opacity-60' : 'inquiry-primary-text'}`}>{selectedLabel}</span>
                    <select
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-lg opacity-0 disabled:cursor-not-allowed"
                    >
                        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                </div>
                <span className="pointer-events-none flex h-4 w-[18px] items-center justify-center inquiry-muted-text">
                    <Icon name="chevronDown" className="h-3.5 w-3.5" />
                </span>
            </div>
        </div>
    );
};

const FieldLabel = ({ children, required }) => (
    <label className="mb-1 block text-right text-[12px] font-black inquiry-primary-text">{children} {required && <span className="text-red-500">*</span>}</label>
);

const TextInput = ({ label, required, ...props }) => (
    <div className="min-w-0">
        <FieldLabel required={required}>{label}</FieldLabel>
        <input {...props} className={`${fieldBase} text-right`} />
    </div>
);

const DynamicField = ({ field, value, onChange, values, fieldsById }) => {
    const parentField = field.parentId ? fieldsById.get(field.parentId) : null;
    const parentValue = field.parentId ? values[field.parentId] : '';
    const dependent = Boolean(field.parentId);
    const availableOptions = dependent ? (parentValue ? (field.dependencyMap?.[parentValue] || []) : []) : (field.options || []);
    const disabledByDependency = dependent && (!parentValue || availableOptions.length === 0);
    const placeholder = disabledByDependency
        ? (parentField ? `בחר/י קודם ${parentField.name}` : 'השדה המשפיע אינו זמין')
        : (field.placeholder || field.name);
    const commonProps = {
        value: value || '',
        onChange: (event) => onChange(field.id, event.target.value),
        placeholder,
        disabled: disabledByDependency
    };

    if (field.type === 'link') {
        const config = field.linkConfig || {};
        const href = config.url || '';
        const external = config.targetType !== 'internal';
        const content = (
            <>
                {config.displayStyle !== 'text' && <Icon name="link" className="h-4 w-4" />}
                <span>{config.label || field.name}</span>
            </>
        );
        return (
            <div className="min-w-0">
                <FieldLabel required={field.required}>{field.name}</FieldLabel>
                {href ? (
                    <a href={href} target={external && config.openInNewTab !== false ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="inquiry-control inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-black text-[var(--color-primary)]">
                        {content}
                    </a>
                ) : (
                    <div className="inquiry-input-surface flex min-h-[36px] items-center justify-center rounded-lg px-3 text-[12px] font-bold inquiry-muted-text">קישור לא הוגדר</div>
                )}
                {config.description && <p className="mt-1 text-right text-[11px] font-semibold inquiry-muted-text">{config.description}</p>}
            </div>
        );
    }

    if (field.type === 'select') {
        return (
            <div className="min-w-0">
                <FieldLabel required={field.required}>{field.name}</FieldLabel>
                <select {...commonProps} className={`${fieldBase} appearance-none text-right disabled:cursor-not-allowed disabled:opacity-60`}>
                    <option value="">{placeholder}</option>
                    {availableOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            </div>
        );
    }

    if (field.type === 'multiselect') {
        const selectedValues = Array.isArray(value) ? value : String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
        const toggle = (option) => {
            const next = selectedValues.includes(option) ? selectedValues.filter((item) => item !== option) : [...selectedValues, option];
            onChange(field.id, next);
        };
        return (
            <div className="min-w-0">
                <FieldLabel required={field.required}>{field.name}</FieldLabel>
                <div className="inquiry-input-surface min-h-[42px] rounded-lg px-2 py-2">
                    {disabledByDependency ? <div className="px-1 text-right text-[12px] font-bold inquiry-muted-text">{placeholder}</div> : (
                        <div className="flex flex-wrap gap-1.5">
                            {availableOptions.map((option) => <button key={option} type="button" onClick={() => toggle(option)} className={`rounded-md border px-2 py-1 text-[11px] font-black ${selectedValues.includes(option) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[var(--color-border-strong)] inquiry-secondary-text'}`}>{option}</button>)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (field.type === 'longtext') {
        return (
            <div className="min-w-0">
                <FieldLabel required={field.required}>{field.name}</FieldLabel>
                <textarea {...commonProps} className="inquiry-input-surface min-h-[96px] w-full resize-y rounded-lg px-3 py-2 text-right text-[12px] font-semibold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
        );
    }

    return (
        <div className="min-w-0">
            <FieldLabel required={field.required}>{field.name}</FieldLabel>
            <div className="relative">
                <input {...commonProps} type={field.type === 'date' ? 'date' : field.type === 'phone' ? 'tel' : 'text'} className={`${fieldBase} pl-9 text-right disabled:cursor-not-allowed disabled:opacity-60`} />
                <Icon name={field.type === 'date' ? 'calendar' : field.type === 'phone' ? 'phone' : 'filePlus'} className="absolute left-3 top-2.5 h-4 w-4 inquiry-muted-text" />
            </div>
        </div>
    );
};
const distributeFieldsIntoColumns = (items) => {
    const columns = [[], []];
    const heights = [0, 0];

    items.forEach((item) => {
        const weight = item.type === 'longtext' ? 2 : 1;
        const columnIndex = heights[0] <= heights[1] ? 0 : 1;
        columns[columnIndex].push(item);
        heights[columnIndex] += weight;
    });

    return columns;
};

const RoomFieldsCard = ({
    fields,
    dynamicFields = [],
    setField,
    environments,
    selectedEnvironment,
    selectedSubEnvironment,
    environmentId,
    setEnvironmentId,
    subEnvironmentId,
    setSubEnvironmentId,
    roomId,
    setRoomId,
    requiredDone,
    assignmentEnabled = true,
    assignedUsersSummary = ''
}) => {
    const dynamicFieldById = useMemo(() => new Map(dynamicFields.map((field) => [field.id, field])), [dynamicFields]);

    const fieldNodes = useMemo(() => {
        const nodes = [
            {
                id: 'handler',
                type: 'text',
                element: <TextInput key="handler" label={LABEL_HANDLER} required value={fields.handler} onChange={(event) => setField('handler', event.target.value)} placeholder={PLACEHOLDER_HANDLER} />
            },
            {
                id: 'treatmentMode',
                type: 'text',
                element: (
                    <div key="treatmentMode" className="min-w-0">
                        <FieldLabel>{LABEL_TREATMENT_MODE}</FieldLabel>
                        <div className="relative">
                            <input value={fields.treatmentMode} onChange={(event) => setField('treatmentMode', event.target.value)} className={`${fieldBase} pl-9 text-right`} placeholder={PLACEHOLDER_ENTER_TREATMENT} />
                            <Icon name="calendar" className="absolute left-3 top-2.5 h-4 w-4 inquiry-muted-text" />
                        </div>
                    </div>
                )
            },
            {
                id: 'location',
                type: 'text',
                element: (
                    <div key="location" className="min-w-0">
                        <FieldLabel>{LABEL_LOCATION}</FieldLabel>
                        <div className="relative">
                            <input value={fields.location} onChange={(event) => setField('location', event.target.value)} className={`${fieldBase} pl-9 text-right`} placeholder={PLACEHOLDER_ENTER_LOCATION} />
                            <Icon name="location" className="absolute left-3 top-2.5 h-4 w-4 inquiry-muted-text" />
                        </div>
                    </div>
                )
            },
            {
                id: 'extraRequired',
                type: 'text',
                element: <TextInput key="extraRequired" label={LABEL_EXTRA_REQUIRED} value={fields.extraRequired} onChange={(event) => setField('extraRequired', event.target.value)} placeholder={PLACEHOLDER_VALUE} />
            },
            {
                id: 'extraOptional',
                type: 'text',
                element: <TextInput key="extraOptional" label={LABEL_EXTRA_OPTIONAL} value={fields.extraOptional} onChange={(event) => setField('extraOptional', event.target.value)} placeholder={PLACEHOLDER_VALUE} />
            }
        ];

        if (assignmentEnabled) {
            nodes.splice(2, 0, {
                id: 'assignment-summary',
                type: 'text',
                element: (
                    <div key="assignment-summary" className="min-w-0">
                        <FieldLabel>{LABEL_ASSIGNEE}</FieldLabel>
                        <div className="inquiry-input-surface flex min-h-[42px] items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-[12px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.04)]">
                            <Icon name="users" className="h-4 w-4 shrink-0 inquiry-muted-text" />
                            <span className={`min-w-0 flex-1 truncate ${assignedUsersSummary ? 'inquiry-primary-text font-black' : 'inquiry-muted-text'}`}>{assignedUsersSummary || PLACEHOLDER_ASSIGNMENT}</span>
                        </div>
                    </div>
                )
            });
        }

        dynamicFields.forEach((field) => {
            nodes.push({
                id: field.id,
                type: field.type,
                element: <DynamicField key={field.id} field={field} value={fields[field.id]} onChange={setField} values={fields} fieldsById={dynamicFieldById} />
            });
        });

        return nodes;
    }, [assignedUsersSummary, assignmentEnabled, dynamicFieldById, dynamicFields, fields, setField]);

    const [rightColumnFields, leftColumnFields] = useMemo(() => distributeFieldsIntoColumns(fieldNodes), [fieldNodes]);

    return (
        <section className="inquiry-panel flex h-full min-h-0 basis-[64%] flex-col overflow-hidden rounded-2xl p-4" dir="rtl">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--color-border)] pb-3">
                <div className="flex min-w-[72px] items-center gap-2">
                    <span className="h-4 w-1.5 rounded-full bg-slate-400" />
                    <h2 className="whitespace-nowrap text-lg font-black inquiry-primary-text">{LABEL_ROOM_FIELDS}</h2>
                </div>

                <CompactSelect className="w-[clamp(160px,15vw,200px)] shrink-0" prefix={LABEL_ENVIRONMENT} value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)} options={environments} />
                <CompactSelect className="w-[clamp(160px,15vw,200px)] shrink-0" prefix={LABEL_SUB_ENVIRONMENT} value={subEnvironmentId} onChange={(event) => setSubEnvironmentId(event.target.value)} options={selectedEnvironment.subEnvironments} disabled={!selectedEnvironment.subEnvironments.length} />
                <CompactSelect className="w-[clamp(90px,9vw,120px)] shrink-0" prefix={LABEL_ROOM} value={roomId} onChange={(event) => setRoomId(event.target.value)} options={selectedSubEnvironment?.rooms ?? []} disabled={!selectedSubEnvironment?.rooms?.length} />

                <div className="mr-auto inline-flex h-7 shrink-0 items-center gap-2 rounded-md bg-blue-700 px-3 text-[12px] font-black text-white">
                    <span>{LABEL_REQUIRED}</span>
                    -
                    <span>{requiredDone}</span>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
                <div className="space-y-4 md:hidden">
                    {fieldNodes.map((item) => item.element)}
                </div>

                <div className="hidden content-start gap-5 md:grid md:grid-cols-2 md:items-start">
                    <div className="space-y-4">{rightColumnFields.map((item) => item.element)}</div>
                    <div className="space-y-4">{leftColumnFields.map((item) => item.element)}</div>
                </div>
            </div>
        </section>
    );
};

export default RoomFieldsCard;
