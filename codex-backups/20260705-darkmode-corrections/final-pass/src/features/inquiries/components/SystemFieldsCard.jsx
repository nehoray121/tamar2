import React, { useEffect, useRef } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const fieldBase = 'h-[34px] w-full rounded-lg border border-blue-100 bg-white px-3 text-[12px] font-semibold text-slate-800 shadow-[0_2px_8px_rgba(37,99,235,0.04)] outline-none transition placeholder:text-blue-200 focus:border-blue-500';

const FieldLabel = ({ children, required, action }) => (
    <div className="mb-1 flex h-5 items-center justify-between gap-2 text-right text-[12px] font-black text-slate-900">
        {action}
        <label>{children} {required && <span className="text-red-500">*</span>}</label>
    </div>
);

const TextField = ({ label, required, icon, action, ...props }) => (
    <div className="min-w-0">
        <FieldLabel required={required} action={action}>{label}</FieldLabel>
        <div className="relative">
            <input {...props} className={`${fieldBase} pl-9 text-right`} />
            {icon && <Icon name={icon} className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />}
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
    onOpenHistory
}) => {
    const templatePopupRef = useRef(null);
    const templateButtonRef = useRef(null);

    useEffect(() => {
        if (!isTemplateOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            const target = event.target;
            if (templatePopupRef.current?.contains(target) || templateButtonRef.current?.contains(target)) {
                return;
            }
            setIsTemplateOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsTemplateOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTemplateOpen, setIsTemplateOpen]);

    return (
        <section className="flex h-full min-h-0 basis-[36%] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]" dir="rtl">
            <div className="shrink-0 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-black text-slate-950">שדות מערכת</h2>
                        <button type="button" className="inline-flex h-7 items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 text-[12px] font-black text-slate-900">
                            <Icon name="copy" className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-slate-500">מספר פנייה:</span>
                            <span>{inquiryId}</span>
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[12px] font-bold text-slate-500">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">ע</span>
                    <span>פותח פנייה:</span>
                    <span className="font-black text-slate-900">עטיה נהוראי</span>
                    <span>· מנהל מערכת</span>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
                <TextField
                    label="מספר אישי של הלקוח"
                    required
                    icon="user"
                    value={fields.personalId}
                    onChange={(event) => setField('personalId', event.target.value)}
                    placeholder="הכנס/י מספר אישי"
                    action={<button type="button" onClick={onOpenHistory} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[12px] font-black text-blue-700"><Icon name="history" className="h-3.5 w-3.5" /> היסטוריית לקוח (6)</button>}
                />

                <TextField label="שם הלקוח" required icon="user" value={fields.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder="הכנס/י שם" />
                <TextField label="טלפון ליצירת קשר" required icon="phone" value={fields.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="הכנס/י טלפון" />

                <div>
                    <FieldLabel required>רמת דחיפות</FieldLabel>
                    <select value={fields.priority} onChange={(event) => setField('priority', event.target.value)} className={`${fieldBase} text-right`}>
                        <option>נמוכה-3</option>
                        <option>בינונית-2</option>
                        <option>גבוהה-1</option>
                    </select>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col">
                    <div className="mb-1 flex h-6 items-center justify-between">
                        <button ref={templateButtonRef} type="button" onClick={() => setIsTemplateOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[12px] font-black text-blue-700">
                            <Icon name="list" className="h-3.5 w-3.5" />
                            הוספת תבנית
                        </button>
                        <label className="text-[12px] font-black text-slate-900">תיאור התקלה <span className="text-red-500">*</span></label>
                    </div>

                    {isTemplateOpen && (
                        <div ref={templatePopupRef} className="absolute bottom-[calc(100%-28px)] right-0 z-30 max-h-40 w-[280px] overflow-y-auto rounded-xl border border-blue-100 bg-white p-2 text-right shadow-[0_16px_30px_rgba(15,23,42,0.14)]">
                            <div className="mb-1 flex items-center justify-between gap-2 px-1">
                                <button type="button" onClick={() => setIsTemplateOpen(false)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-white text-slate-400">
                                    <Icon name="close" className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] font-black text-slate-500">בחירת תבנית</span>
                            </div>
                            {templates.map((template) => (
                                <button key={template} type="button" onClick={() => selectTemplate(template)} className="block w-full rounded-lg px-3 py-2 text-right text-[12px] font-semibold leading-5 text-slate-700 hover:bg-blue-50">
                                    {template}
                                </button>
                            ))}
                        </div>
                    )}

                    <textarea
                        value={fields.description}
                        onChange={(event) => setField('description', event.target.value)}
                        className="min-h-[120px] flex-1 resize-none rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-right text-[13px] font-semibold leading-6 text-slate-800 outline-none placeholder:text-blue-200"
                        placeholder="תיאור מפורט... (הקלד / לתבנית)"
                    />
                </div>
            </div>
        </section>
    );
};

export default SystemFieldsCard;
