import React, { useMemo, useRef } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import PortalMenu from '../../../components/common/PortalMenu.jsx';
import { summarizeIncidentTemplate } from '../../settings/constants/settingsDefaults.js';

const fieldBase = 'inquiry-input-surface h-[34px] w-full rounded-lg px-3 text-[12px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.04)] outline-none transition focus:border-blue-500';
const LABEL_SYSTEM_FIELDS = 'שדות מערכת';
const LABEL_INQUIRY_ID = 'מספר פנייה:';
const LABEL_OPENED_BY = 'פותח פנייה:';
const LABEL_HISTORY = 'היסטוריית לקוח';
const LABEL_CUSTOMER_ID = 'מספר אישי של הלקוח';
const LABEL_CUSTOMER_NAME = 'שם הלקוח';
const LABEL_PHONE = 'טלפון ליצירת קשר';
const LABEL_PRIORITY = 'רמת דחיפות';
const LABEL_TEMPLATE = 'הוספת תבנית';
const LABEL_TEMPLATE_PICKER = 'בחירת תבנית';
const PLACEHOLDER_CUSTOMER_ID = 'הכנס/י מספר אישי';
const PLACEHOLDER_CUSTOMER_NAME = 'הכנס/י שם';
const PLACEHOLDER_PHONE = 'הכנס/י טלפון';
const DEFAULT_DESCRIPTION_LABEL = 'תיאור תקלה';
const DEFAULT_DESCRIPTION_PLACEHOLDER = 'לדוגמה: תיאור הפנייה, דרך פתרון...';
const PRIORITY_LOW = 'נמוכה-3';
const PRIORITY_MEDIUM = 'בינונית-2';
const PRIORITY_HIGH = 'גבוהה-1';

const FieldLabel = ({ children, required, action }) => (
    <div className="mb-2 flex h-5 items-center justify-between gap-2 text-right text-[12px] font-black inquiry-primary-text">
        <label>{children} {required && <span className="text-red-500">*</span>}</label>
        {action}
    </div>
);

const TextField = ({ label, required, icon, action, ...props }) => (
    <div className="min-w-0">
        <FieldLabel required={required} action={action}>{label}</FieldLabel>
        <div className="relative">
            <input {...props} className={`${fieldBase} pl-9 text-right`} />
            {icon && <Icon name={icon} className="absolute left-3 top-2.5 h-4 w-4 inquiry-muted-text" />}
        </div>
    </div>
);

const SystemFieldsCard = ({
    inquiryId,
    fields,
    setField,
    templates,
    isTemplateOpen,
    setIsTemplateOpen,
    selectTemplate,
    incidentDescriptionSettings,
    onOpenHistory,
    openedBy,
    historyCount = 0
}) => {
    const templateButtonRef = useRef(null);
    const descriptionLabel = incidentDescriptionSettings?.label || DEFAULT_DESCRIPTION_LABEL;
    const descriptionPlaceholder = incidentDescriptionSettings?.placeholder || DEFAULT_DESCRIPTION_PLACEHOLDER;
    const descriptionHelpText = incidentDescriptionSettings?.helpText || '';
    const descriptionRequired = incidentDescriptionSettings?.required !== false;
    const normalizedTemplates = useMemo(() => templates.filter((template) => template?.id && template?.content), [templates]);

    return (
        <section className="inquiry-panel flex h-full min-h-0 basis-[36%] flex-col overflow-hidden rounded-2xl p-4" dir="rtl">
            <div className="shrink-0 border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-black inquiry-primary-text">{LABEL_SYSTEM_FIELDS}</h2>
                        <button type="button" className="inquiry-control inline-flex h-7 items-center gap-2 rounded-md px-3 text-[12px] font-black">
                            <Icon name="copy" className="h-3.5 w-3.5 text-blue-400" />
                            <span className="inquiry-muted-text">{LABEL_INQUIRY_ID}</span>
                            <span className="inquiry-primary-text">{inquiryId}</span>
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[12px] font-bold inquiry-secondary-text">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-700">ע</span>
                    <span>{LABEL_OPENED_BY}</span>
                    <span className="font-black inquiry-primary-text">{openedBy || 'המשתמש המחובר'}</span>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
                <TextField
                    label={LABEL_CUSTOMER_ID}
                    required
                    icon="user"
                    value={fields.personalId}
                    onChange={(event) => setField('personalId', event.target.value)}
                    placeholder={PLACEHOLDER_CUSTOMER_ID}
                    action={<button type="button" onClick={onOpenHistory} className="inquiry-control inquiry-control--active inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-black"><Icon name="history" className="h-3.5 w-3.5" /> {LABEL_HISTORY}{historyCount ? ` (${historyCount})` : ''}</button>}
                />

                <TextField label={LABEL_CUSTOMER_NAME} required icon="user" value={fields.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder={PLACEHOLDER_CUSTOMER_NAME} />
                <TextField label={LABEL_PHONE} required icon="phone" value={fields.phone} onChange={(event) => setField('phone', event.target.value)} placeholder={PLACEHOLDER_PHONE} />

                <div>
                    <FieldLabel required>{LABEL_PRIORITY}</FieldLabel>
                    <select value={fields.priority} onChange={(event) => setField('priority', event.target.value)} className={`${fieldBase} text-right`}>
                        <option>{PRIORITY_LOW}</option>
                        <option>{PRIORITY_MEDIUM}</option>
                        <option>{PRIORITY_HIGH}</option>
                    </select>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="mb-1 flex h-6 items-center justify-between gap-2">
                        <label className="text-[12px] font-black inquiry-primary-text">{descriptionLabel} {descriptionRequired && <span className="text-red-500">*</span>}</label>
                        <button
                            ref={templateButtonRef}
                            type="button"
                            onClick={() => setIsTemplateOpen((value) => !value)}
                            className="inquiry-control inquiry-control--active inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-black"
                            aria-expanded={isTemplateOpen}
                            aria-haspopup="dialog"
                        >
                            <Icon name="list" className="h-3.5 w-3.5" />
                            {LABEL_TEMPLATE}
                        </button>
                    </div>

                    <PortalMenu anchorRef={templateButtonRef} open={isTemplateOpen} onClose={() => setIsTemplateOpen(false)}>
                        <div className="inquiry-menu-surface max-h-[320px] w-[320px] overflow-y-auto rounded-2xl p-2 text-right" role="dialog" aria-label={LABEL_TEMPLATE_PICKER} dir="rtl">
                            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                <button type="button" onClick={() => setIsTemplateOpen(false)} className="inquiry-control flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 inquiry-muted-text" aria-label="סגור בחירת תבנית">
                                    <Icon name="close" className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] font-black inquiry-muted-text">{LABEL_TEMPLATE_PICKER}</span>
                            </div>
                            {normalizedTemplates.map((template) => (
                                <button key={template.id} type="button" onClick={() => selectTemplate(template)} className="inquiry-menu-item block w-full rounded-xl border border-transparent px-3 py-2 text-right text-[12px] font-semibold leading-5 transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:outline-none">
                                    <span className="block text-[12px] font-black inquiry-primary-text">{summarizeIncidentTemplate(template.content)}</span>
                                    <span className="mt-1 block whitespace-pre-line text-[11px] inquiry-muted-text">{template.content}</span>
                                </button>
                            ))}
                            {!normalizedTemplates.length && <div className="px-3 py-4 text-center text-[12px] font-bold inquiry-muted-text">לא הוגדרו תבניות עדיין.</div>}
                        </div>
                    </PortalMenu>

                    <textarea
                        value={fields.description}
                        onChange={(event) => setField('description', event.target.value)}
                        className="inquiry-input-surface min-h-0 flex-1 resize-none overflow-y-auto rounded-xl border-2 border-blue-600 px-4 py-3 text-right text-[13px] font-semibold leading-6 outline-none"
                        placeholder={descriptionPlaceholder}
                    />
                    {descriptionHelpText && <p className="mt-2 text-right text-[11px] font-semibold leading-5 inquiry-muted-text">{descriptionHelpText}</p>}
                </div>
            </div>
        </section>
    );
};

export default SystemFieldsCard;
