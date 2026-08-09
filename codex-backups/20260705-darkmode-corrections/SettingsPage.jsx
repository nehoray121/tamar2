import React, { useMemo, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';

const fieldTemplates = [
    { type: 'longtext', name: 'טקסט חופשי', example: 'לדוגמה: תיאור פנייה, דרך פתרון...', icon: 'list' },
    { type: 'select', name: 'בחירת אפשרות', example: 'לדוגמה: רשימת רשויות, יחידות...', icon: 'chevronDown' },
    { type: 'text', name: 'טקסט קצר', example: 'לדוגמה: שם פרטי, שם משפחה...', icon: 'filePlus' }
];

const initialFields = [
    { id: 'priority', name: 'דחיפות', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'רמת דחיפות הפנייה', options: ['גבוהה-1', 'בינונית-2', 'נמוכה-3'] },
    { id: 'handler', name: 'גורם מטפל', type: 'user', typeLabel: 'משתמש', required: true, locked: true, placeholder: 'בחר גורם מטפל' },
    { id: 'customerId', name: 'מ.א של לקוח', type: 'text', typeLabel: 'טקסט', required: true, locked: true, placeholder: 'הכנס/י מספר לקוח' },
    { id: 'treatment', name: 'אופן טיפול בפנייה', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'אופן טיפול', options: ['הפנייה בטיפול', 'טופל במקום', 'ממתין ללקוח'] },
    { id: 'description', name: 'תיאור התקלה', type: 'longtext', typeLabel: 'טקסט', required: true, locked: true, placeholder: 'תיאור מפורט' },
    { id: 'location', name: 'מיקום', type: 'text', typeLabel: 'טקסט', required: false, placeholder: 'מיקום' },
    { id: 'city', name: 'עיר', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר עיר', options: ['תל אביב', 'חיפה', 'ירושלים'] },
    { id: 'neighborhood', name: 'שכונה', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר שכונה', options: ['פלורנטין', 'יפו', 'רמת אביב', 'נווה צדק', 'הדר', 'רחביה', 'תלפיות', 'גילה', 'פסגת זאב'], parentId: 'city', dependencyMap: { 'תל אביב': ['פלורנטין', 'יפו', 'רמת אביב', 'נווה צדק'], 'חיפה': ['הדר'], 'ירושלים': ['רחביה', 'תלפיות', 'גילה', 'פסגת זאב'] } },
    { id: 'status', name: 'סטטוס', type: 'select', typeLabel: 'בחירה', required: true, locked: true, placeholder: 'סטטוס', options: ['פתוחה', 'בטיפול', 'סגורה'] },
    { id: 'openDate', name: 'תאריך פתיחה', type: 'date', typeLabel: 'תאריך', required: true, locked: true, placeholder: 'תאריך פתיחה' },
    { id: 'phone', name: 'טלפון', type: 'phone', typeLabel: 'טלפון', required: false, placeholder: 'טלפון ליצירת קשר' },
    { id: 'network', name: 'סוג רשת', type: 'select', typeLabel: 'בחירה', required: false, placeholder: 'בחר סוג רשת', options: ['סודי', 'גלוי'] },
    { id: 'closingDate', name: 'תאריך סגירה', type: 'date', typeLabel: 'תאריך', required: false, placeholder: 'טרם נסגר' },
    { id: 'extraNotes', name: 'שדות נוספים', type: 'longtext', typeLabel: 'טקסט', required: false, placeholder: 'ערך נוסף' }
];

const widthOptions = ['רוחב מלא', 'חצי רוחב', 'שליש רוחב'];
const tabs = [
    { id: 'fields', label: 'הגדרות פנייה' },
    { id: 'display', label: 'הגדרות תצוגה' },
    { id: 'general', label: 'הגדרות כלליות' }
];

const cn = (...values) => values.filter(Boolean).join(' ');
const cloneField = (field) => ({ ...field, options: [...(field.options || [])], dependencyMap: { ...(field.dependencyMap || {}) } });

const SectionShell = ({ title, meta, children, className = '' }) => (
    <section className={cn('rounded-3xl border border-[#D7E7FF] bg-white shadow-[0_12px_30px_rgba(37,99,235,0.06)]', className)}>
        <div className="flex min-h-[54px] items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-[17px] font-black text-slate-950">{title}</h2>
            {meta && <span className="rounded-full bg-[#EAF4FF] px-3 py-1 text-xs font-black text-slate-500">{meta}</span>}
        </div>
        {children}
    </section>
);

const OptionChip = ({ children, onRemove }) => (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#D7E7FF] bg-white px-2.5 text-[12px] font-bold text-slate-700 shadow-sm">
        {children}
        {onRemove && <button type="button" onClick={onRemove} className="text-slate-300 transition hover:text-red-500"><Icon name="close" className="h-3 w-3" /></button>}
    </span>
);

const TemplateCard = ({ template, onCreate }) => (
    <button type="button" onClick={() => onCreate(template)} className="w-full rounded-2xl border border-[#D7E7FF] bg-white p-3 text-right shadow-sm transition hover:border-[#93C5FD] hover:bg-[#F8FBFF]">
        <div className="flex items-center justify-between gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#2563EB]"><Icon name={template.icon} className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-black text-slate-900">{template.name}</div>
                <div className="mt-1 truncate text-[11px] font-semibold text-slate-400">{template.example}</div>
            </div>
        </div>
    </button>
);

const ActiveFieldRow = ({ field, index, selected, onSelect, onDragStart, onDrop }) => (
    <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onClick={onSelect}
        className={cn('group flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-right transition', selected ? 'border-[#3B82F6] bg-[#EAF4FF] shadow-sm' : 'border-transparent bg-white hover:border-[#C9E1FF]')}
    >
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black', selected ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-slate-500')}>{index + 1}</span>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-black text-slate-900">{field.name}</span>
                {field.required && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-red-500">חובה</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span>{field.typeLabel}</span>
                {field.parentId && <><span>·</span><span className="text-[#2563EB]">מסונן לפי שדה אחר</span></>}
            </div>
        </div>
        <Icon name="grip" className="h-4 w-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    </button>
);

const IntegratedOptionSelector = ({ field, selectedValues, onChange, onAddOption }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [newValue, setNewValue] = useState('');
    const options = (field.options || []).filter((option) => option.includes(query));
    const summary = selectedValues.length === 0 ? 'בחירת אפשרויות שיוצגו...' : selectedValues.length <= 2 ? selectedValues.join(', ') : `${selectedValues[0]}, ${selectedValues[1]} ועוד ${selectedValues.length - 2}`;

    const toggle = (option) => onChange(selectedValues.includes(option) ? selectedValues.filter((item) => item !== option) : [...selectedValues, option]);

    return (
        <div className="relative max-w-[320px]">
            <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-9 w-full items-center justify-between rounded-xl border border-[#C9E1FF] bg-white px-3 text-right text-[12px] font-bold text-slate-600 shadow-sm">
                <span className="truncate">{summary}</span>
                <Icon name="chevronDown" className="h-3.5 w-3.5 text-[#2563EB]" />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-40 mt-1 w-full overflow-hidden rounded-2xl border border-[#C9E1FF] bg-white shadow-[0_18px_44px_rgba(37,99,235,0.18)]">
                    <div className="p-2">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש אפשרות..." className="h-8 w-full rounded-lg border border-[#D7E7FF] px-2 text-[12px] font-bold outline-none focus:border-[#3B82F6]" />
                    </div>
                    <div className="max-h-36 overflow-y-auto px-2 pb-2">
                        {options.map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-[#F8FBFF]">
                                <input type="checkbox" checked={selectedValues.includes(option)} onChange={() => toggle(option)} className="h-3.5 w-3.5 accent-blue-600" />
                                {option}
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-2">
                        <input value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="אפשרות חדשה" className="h-8 min-w-0 flex-1 rounded-lg border border-[#D7E7FF] px-2 text-[12px] font-bold outline-none" />
                        <button type="button" onClick={() => { const value = newValue.trim(); if (!value) return; onAddOption(value); onChange([...new Set([...selectedValues, value])]); setNewValue(''); }} className="rounded-lg bg-[#2563EB] px-3 text-[12px] font-black text-white">הוסף</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const BehaviorTestModal = ({ field, parentField, onClose }) => {
    const [parentValue, setParentValue] = useState('');
    const [childValue, setChildValue] = useState('');
    const filtered = parentValue ? (field.dependencyMap?.[parentValue] || []) : [];
    const disabled = !parentValue || filtered.length === 0;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl border border-[#D7E7FF] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-950">בדיקת התנהגות</h3>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D7E7FF] text-slate-400"><Icon name="close" className="h-4 w-4" /></button>
                </div>
                <p className="mb-4 text-[12px] font-semibold leading-5 text-slate-500">השדה נשאר גלוי, אך מושבת עד שנבחר ערך בשדה המשפיע. שינוי הבחירה מנקה ערך שאינו תקף.</p>
                <label className="mb-3 block text-[12px] font-black text-slate-700">{parentField.name}</label>
                <select value={parentValue} onChange={(event) => { setParentValue(event.target.value); setChildValue(''); }} className="mb-4 h-10 w-full rounded-xl border border-[#C9E1FF] bg-white px-3 text-sm font-bold outline-none">
                    <option value="">בחר {parentField.name}</option>
                    {parentField.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <label className="mb-3 block text-[12px] font-black text-slate-700">{field.name}</label>
                <select disabled={disabled} value={childValue} onChange={(event) => setChildValue(event.target.value)} className="h-10 w-full rounded-xl border border-[#C9E1FF] bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-50 disabled:text-slate-400">
                    <option value="">{!parentValue ? `בחר קודם ${parentField.name}` : filtered.length ? `בחר ${field.name}` : 'לא הוגדרו אפשרויות לבחירה זו'}</option>
                    {filtered.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            </div>
        </div>
    );
};

const DependencyEditor = ({ field, fields, onFieldChange, onOpenTest }) => {
    const parentField = fields.find((item) => item.id === field.parentId);
    const [activeAnswer, setActiveAnswer] = useState(parentField?.options?.[0] || '');

    if (!parentField) return null;

    const updateMap = (answer, values) => onFieldChange({ ...field, dependencyMap: { ...(field.dependencyMap || {}), [answer]: values } });
    const addOption = (value) => onFieldChange({ ...field, options: [...new Set([...(field.options || []), value])] });

    return (
        <div className="rounded-2xl border border-[#D7E7FF] bg-[#F8FBFF] p-3">
            <div className="mb-3 flex items-center justify-between gap-3 text-[12px] font-bold text-slate-500">
                <div className="flex items-center gap-2 text-slate-700"><span>{parentField.name}</span><Icon name="arrowLeft" className="h-3.5 w-3.5 text-[#2563EB]" /><span>{field.name}</span></div>
                <button type="button" onClick={() => onFieldChange({ ...field, parentId: undefined, dependencyMap: {} })} className="text-slate-400 transition hover:text-red-500">הסר קשר</button>
            </div>
            <p className="mb-3 text-[12px] font-semibold leading-5 text-slate-500">בחירת {parentField.name} מסננת את אפשרויות {field.name}, אך אינה בוחרת תשובה אוטומטית.</p>
            <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-[#D7E7FF] bg-white">
                    {parentField.options.map((answer) => (
                        <button key={answer} type="button" onClick={() => setActiveAnswer(answer)} className={cn('flex min-h-[42px] w-full items-center justify-between border-b border-slate-100 px-3 text-right text-[12px] font-black last:border-b-0', activeAnswer === answer ? 'bg-[#EAF4FF] text-[#2563EB]' : 'text-slate-600 hover:bg-slate-50')}>
                            <span>{answer}</span>
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-slate-400">{(field.dependencyMap?.[answer] || []).length} אפשרויות</span>
                        </button>
                    ))}
                </div>
                <div className="rounded-2xl border border-[#D7E7FF] bg-white p-3">
                    <div className="mb-3 text-[13px] font-black text-slate-900">אילו אפשרויות יוצגו כאשר נבחרה "{activeAnswer}"?</div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {(field.dependencyMap?.[activeAnswer] || []).map((option) => <OptionChip key={option} onRemove={() => updateMap(activeAnswer, (field.dependencyMap?.[activeAnswer] || []).filter((item) => item !== option))}>{option}</OptionChip>)}
                    </div>
                    <IntegratedOptionSelector field={field} selectedValues={field.dependencyMap?.[activeAnswer] || []} onChange={(values) => updateMap(activeAnswer, values)} onAddOption={addOption} />
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] font-bold text-slate-500">
                <span>{parentField.options.filter((answer) => (field.dependencyMap?.[answer] || []).length > 0).length} מתוך {parentField.options.length} תשובות הוגדרו</span>
                <button type="button" onClick={onOpenTest} className="rounded-xl border border-[#C9E1FF] bg-white px-3 py-1.5 text-[#2563EB] shadow-sm">בדיקת התנהגות</button>
            </div>
        </div>
    );
};

const FieldEditor = ({ field, fields, onChange, onSave, onDelete, onCancel, onOpenTest }) => {
    if (!field) {
        return <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#BBD7FF] bg-white/70 p-6 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4FF] text-[#2563EB]"><Icon name="settings" className="h-6 w-6" /></span><h3 className="text-lg font-black text-slate-950">בחרו שדה לעריכה</h3><p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-400">בחרו שדה פעיל או צרו שדה חדש מתבנית כדי לערוך שם, חובה, אפשרויות ותלות.</p></div>;
    }

    const parentCandidates = fields.filter((item) => item.id !== field.id && item.type === 'select');

    return (
        <section className="rounded-3xl border border-[#D7E7FF] bg-white shadow-[0_12px_30px_rgba(37,99,235,0.06)]">
            <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <h2 className="text-[20px] font-black text-slate-950">{field.isNew ? 'הגדרת שדה חדש' : `עריכת שדה: ${field.name}`}</h2>
                <label className="flex items-center gap-2 text-[13px] font-black text-slate-700"><input type="checkbox" checked={field.required} disabled={field.locked} onChange={(event) => onChange({ ...field, required: event.target.checked })} className="h-4 w-4 accent-blue-600" /> שדה חובה</label>
            </div>
            <div className="space-y-4 p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                    <label className="block text-[12px] font-black text-slate-700">שם השדה<input value={field.name} onChange={(event) => onChange({ ...field, name: event.target.value })} className="mt-2 h-10 w-full rounded-xl border border-[#D7E7FF] px-3 text-sm font-bold outline-none focus:border-[#3B82F6]" /></label>
                    <label className="block text-[12px] font-black text-slate-700">טקסט מנחה<input value={field.placeholder || ''} onChange={(event) => onChange({ ...field, placeholder: event.target.value })} className="mt-2 h-10 w-full rounded-xl border border-[#D7E7FF] px-3 text-sm font-bold outline-none focus:border-[#3B82F6]" /></label>
                </div>

                {field.type === 'select' && (
                    <div className="rounded-2xl border border-[#D7E7FF] bg-slate-50/60 p-3">
                        <div className="mb-2 flex items-center justify-between"><h3 className="text-[14px] font-black text-slate-900">אפשרויות בחירה</h3><button type="button" onClick={() => onChange({ ...field, options: [...(field.options || []), `אפשרות ${(field.options || []).length + 1}`] })} className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-black text-[#2563EB] shadow-sm"><Icon name="plus" className="ml-1 inline h-3 w-3" />הוסף</button></div>
                        <div className="flex flex-wrap gap-2">
                            {(field.options || []).slice(0, 8).map((option) => <OptionChip key={option} onRemove={() => onChange({ ...field, options: field.options.filter((item) => item !== option) })}>{option}</OptionChip>)}
                            {(field.options || []).length > 8 && <OptionChip>+ {(field.options || []).length - 8} נוספות</OptionChip>}
                        </div>
                    </div>
                )}

                {field.type === 'select' && (
                    <div className="rounded-2xl border border-[#D7E7FF] bg-white p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[14px] font-black text-slate-900">אפשרויות תלויות</h3><p className="mt-1 text-[12px] font-semibold text-slate-400">בחרו שדה משפיע כדי לסנן את האפשרויות.</p></div><select value={field.parentId || ''} onChange={(event) => onChange({ ...field, parentId: event.target.value || undefined, dependencyMap: event.target.value ? field.dependencyMap || {} : {} })} className="h-9 rounded-xl border border-[#D7E7FF] px-3 text-[12px] font-bold outline-none"><option value="">ללא תלות</option>{parentCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                        {field.parentId && <DependencyEditor field={field} fields={fields} onFieldChange={onChange} onOpenTest={onOpenTest} />}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <button type="button" onClick={onSave} className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">שמור שדה</button>
                <div className="flex gap-2">
                    {!field.isNew && !field.locked && <button type="button" onClick={onDelete} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-600">מחק שדה</button>}
                    <button type="button" onClick={onCancel} className="rounded-xl border border-[#D7E7FF] bg-white px-4 py-2 text-sm font-black text-slate-500">ביטול</button>
                </div>
            </div>
        </section>
    );
};

const DisplaySettings = ({ fields, tableFields, setTableFields, sections, setSections }) => {
    const [mode, setMode] = useState('card');
    const [draggedTableIndex, setDraggedTableIndex] = useState(null);
    const byId = new Map(fields.map((field) => [field.id, field]));
    const availableFields = fields.filter((field) => !tableFields.includes(field.id));

    const toggleVisible = (sectionId, fieldId) => setSections((current) => current.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, visible: !field.visible } : field) } : section));
    const updateWidth = (sectionId, fieldId, width) => setSections((current) => current.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, width } : field) } : section));
    const addSectionAfter = (index) => setSections((current) => { const next = [...current]; next.splice(index + 1, 0, { id: `section-${Date.now()}`, title: 'מקטע חדש', fields: [] }); return next; });

    return (
        <div className="space-y-4">
            <SectionShell title="עריכת תצורת פנייה">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm font-semibold text-slate-500">סדרו את המקטעים והשדות כפי שיופיעו בחלון הצפייה בפנייה.</p><div className="flex rounded-xl bg-slate-100 p-1">{[{ id: 'table', label: 'פנייה בטבלה' }, { id: 'card', label: 'תצורת פנייה' }].map((item) => <button key={item.id} type="button" onClick={() => setMode(item.id)} className={cn('rounded-lg px-4 py-2 text-sm font-black transition', mode === item.id ? 'bg-white text-[#2563EB] shadow-sm' : 'text-slate-500')}>{item.label}</button>)}</div></div>
            </SectionShell>

            {mode === 'table' ? (
                <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 py-4">
                    <div className="flex flex-col gap-5">
                        <div className="text-center text-[15px] font-semibold text-slate-500">
                            גררו שדות אל השורה כדי לקבוע אילו פרטים יוצגו בטבלת הפניות ובאיזה סדר.
                        </div>

                        <div className="mx-auto flex min-h-[64px] w-full max-w-[1000px] items-center gap-4 rounded-xl border border-[#D7E7FF] bg-white py-3 pl-3 pr-6 shadow-sm">
                            <div className="flex flex-1 items-center gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(tableFields.length, 1)}, minmax(0, 1fr))`, display: 'grid' }}>
                                {tableFields.map((id) => (
                                    <div key={id} className="flex items-center gap-1.5 text-[13px] font-black text-[#3B82F6]">
                                        <span className="truncate">{byId.get(id)?.name || 'שדה לא נבחר'}</span>
                                        <Icon name={byId.get(id)?.type === 'date' ? 'calendar' : byId.get(id)?.type === 'phone' ? 'phone' : byId.get(id)?.type === 'user' ? 'user' : 'hash'} className="h-4 w-4 opacity-50" />
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex shrink-0 items-center gap-2 border-r border-slate-100 pr-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3A8A] text-white"><Icon name="eye" className="h-4 w-4" /></div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981] text-white"><Icon name="check" className="h-4 w-4" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto w-full max-w-[1000px] rounded-3xl border border-[#D7E7FF] bg-white/60 p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            {tableFields.map((id, index) => (
                                <div
                                    key={`${id}-${index}`}
                                    draggable
                                    onDragStart={(e) => {
                                        setDraggedTableIndex(index);
                                        e.currentTarget.style.opacity = '0.5';
                                    }}
                                    onDragEnd={(e) => {
                                        setDraggedTableIndex(null);
                                        e.currentTarget.style.opacity = '1';
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedTableIndex === null || draggedTableIndex === index) return;
                                        setTableFields((current) => {
                                            const next = [...current];
                                            const [moved] = next.splice(draggedTableIndex, 1);
                                            next.splice(index, 0, moved);
                                            return next;
                                        });
                                        setDraggedTableIndex(null);
                                    }}
                                    className="flex w-[210px] flex-col rounded-2xl border border-[#D7E7FF] bg-white p-4 shadow-sm transition-all hover:border-[#93C5FD] hover:shadow-md"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <button type="button" onClick={() => setTableFields((current) => current.filter((_, i) => i !== index))} className="rounded-lg p-1 transition-colors hover:bg-red-50 hover:text-red-500"><Icon name="trash" className="h-4 w-4" /></button>
                                            <div className="cursor-move rounded-lg p-1 transition-colors hover:bg-[#F8FBFF] hover:text-[#2563EB]"><Icon name="grip" className="h-4 w-4" /></div>
                                        </div>
                                        <span className="text-[13px] font-black text-slate-600">מיקום {index + 1}</span>
                                    </div>
                                    <select
                                        value={id}
                                        onChange={(event) => {
                                            const val = event.target.value;
                                            setTableFields((current) => current.map((item, i) => (i === index ? val : item)));
                                        }}
                                        className="h-11 w-full rounded-xl border border-[#D7E7FF] bg-white px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-[#3B82F6]"
                                    >
                                        <option value={id} className="hidden">{byId.get(id)?.name}</option>
                                        {fields.filter(f => !tableFields.includes(f.id) || f.id === id).map((field) => (
                                            <option key={field.id} value={field.id}>{field.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            {tableFields.length < 5 && (
                                <div className="flex w-[210px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#BBD7FF] bg-[#F8FBFF] p-4 transition-colors hover:border-[#93C5FD]">
                                    <div className="mb-4 text-[13px] font-black text-[#2563EB]">מיקום {tableFields.length + 1}</div>
                                    <select
                                        value=""
                                        onChange={(event) => {
                                            if (event.target.value) setTableFields((current) => [...current, event.target.value]);
                                        }}
                                        className="h-11 w-full rounded-xl border border-[#D7E7FF] bg-white px-3 text-[13px] font-bold text-[#2563EB] outline-none focus:border-[#3B82F6]"
                                    >
                                        <option value="">בחרו שדה...</option>
                                        {availableFields.map((field) => (
                                            <option key={field.id} value={field.id}>{field.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <SectionShell title="תצוגה מקדימה"><div className="bg-[#F8FBFF] p-4"><div className="rounded-2xl border border-[#D7E7FF] bg-white p-4"><div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-600">פתוחה</span><span className="rounded-lg bg-pink-50 px-2 py-1 text-xs font-black text-pink-600">נמוכה-3</span></div>{sections.map((section) => <div key={section.id} className="mb-4"><h4 className="mb-2 text-sm font-black text-slate-900">{section.title}</h4><div className="grid gap-2 sm:grid-cols-2">{section.fields.filter((item) => item.visible).slice(0, 4).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-400">{byId.get(item.id)?.name}</div><div className="mt-1 text-[13px] font-black text-slate-900">{byId.get(item.id)?.placeholder || '[ערך]'}</div></div>)}</div></div>)}</div></div></SectionShell>
                    <SectionShell title="בונה תצורת פנייה"><div className="space-y-3 p-4">{sections.map((section, index) => <React.Fragment key={section.id}><div className="overflow-hidden rounded-2xl border border-[#D7E7FF]"><div className="flex items-center justify-between bg-slate-50 px-4 py-3"><h3 className="text-sm font-black text-slate-900">{section.title}</h3><span className="text-xs font-bold text-slate-400">{section.fields.filter((item) => item.visible).length} שדות מוצגים</span></div><div className="grid gap-2 p-3 md:grid-cols-2">{section.fields.map((item) => <div key={item.id} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', item.visible ? 'border-[#D7E7FF] bg-white' : 'border-slate-100 bg-slate-50 opacity-60')}><button type="button" onClick={() => toggleVisible(section.id, item.id)} className="text-[#2563EB]"><Icon name={item.visible ? 'eye' : 'close'} className="h-4 w-4" /></button><span className="flex-1 text-sm font-black text-slate-800">{byId.get(item.id)?.name}</span><select value={item.width} onChange={(event) => updateWidth(section.id, item.id, event.target.value)} className="h-8 rounded-lg border border-slate-100 bg-slate-50 px-2 text-xs font-bold text-slate-600">{widthOptions.map((option) => <option key={option}>{option}</option>)}</select></div>)}</div></div><button type="button" onClick={() => addSectionAfter(index)} className="mx-auto flex rounded-full border border-dashed border-[#BBD7FF] bg-white px-4 py-2 text-xs font-black text-[#2563EB]"><Icon name="plus" className="ml-1 h-3.5 w-3.5" />הוסף מקטע כאן</button></React.Fragment>)}</div></SectionShell>
                </div>
            )}
        </div>
    );
};

const GeneralSettings = ({ settings, setSettings }) => {
    const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
    const rows = [
        { key: 'defaultPriority', label: 'ברירת מחדל לדחיפות', value: settings.defaultPriority, options: ['נמוכה-3', 'בינונית-2', 'גבוהה-1'] },
        { key: 'duplicateWarning', label: 'אזהרת פנייה כפולה', value: settings.duplicateWarning, options: ['פעילה', 'כבויה'] },
        { key: 'autoAssign', label: 'שיוך אוטומטי', value: settings.autoAssign, options: ['ללא', 'לפי חדר', 'לפי עומס'] },
        { key: 'numberFormat', label: 'פורמט מספר פנייה', value: settings.numberFormat, options: ['M-YY-מספר', 'חדר-מספר', 'מספר בלבד'] }
    ];

    return (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
                <SectionShell key={row.key} title={row.label}>
                    <div className="p-4">
                        <select value={row.value} onChange={(event) => update(row.key, event.target.value)} className="h-10 w-full rounded-xl border border-[#D7E7FF] bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#3B82F6]">
                            {row.options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                        <p className="mt-3 text-[12px] font-semibold leading-5 text-slate-400">הגדרה זמנית בצד לקוח, מוכנה לחיבור לשירות שמירה בהמשך.</p>
                    </div>
                </SectionShell>
            ))}
        </div>
    );
};

const makeSections = (fields) => [
    { id: 'critical', title: 'מידע קריטי', fields: fields.slice(0, 4).map((field) => ({ id: field.id, visible: true, width: 'חצי רוחב' })) },
    { id: 'details', title: 'מידע נלווה', fields: fields.slice(4, 8).map((field) => ({ id: field.id, visible: true, width: 'חצי רוחב' })) },
    { id: 'description', title: 'תיאור הפנייה', fields: fields.slice(8, 9).map((field) => ({ id: field.id, visible: true, width: 'רוחב מלא' })) },
    { id: 'extra', title: 'שדות נוספים', fields: fields.slice(9, 14).map((field) => ({ id: field.id, visible: true, width: 'חצי רוחב' })) }
];

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('fields');
    const [fields, setFields] = useState(initialFields);
    const [editingField, setEditingField] = useState(() => cloneField(initialFields[7]));
    const [draggedId, setDraggedId] = useState(null);
    const [tableFields, setTableFields] = useState(() => initialFields.slice(0, 5).map((field) => field.id));
    const [sections, setSections] = useState(() => makeSections(initialFields));
    const [testField, setTestField] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [generalSettings, setGeneralSettings] = useState({ defaultPriority: 'נמוכה-3', duplicateWarning: 'פעילה', autoAssign: 'ללא', numberFormat: 'M-YY-מספר' });

    const selectedId = editingField?.id;
    const fieldById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);

    const selectField = (field) => setEditingField(cloneField(field));
    const updateEditing = (field) => { setEditingField(cloneField(field)); setDirty(true); };

    const createFromTemplate = (template) => {
        const id = `field-${Date.now()}`;
        const field = {
            id,
            isNew: true,
            name: template.type === 'select' ? 'בחירת אפשרות חדשה' : template.type === 'text' ? 'טקסט קצר חדש' : 'טקסט חופשי חדש',
            type: template.type,
            typeLabel: template.type === 'select' ? 'בחירה' : 'טקסט',
            required: false,
            placeholder: template.example,
            options: template.type === 'select' ? ['אפשרות 1', 'אפשרות 2'] : []
        };
        setEditingField(field);
        setDirty(true);
    };

    const saveField = () => {
        if (!editingField) return;
        const fieldToSave = cloneField(editingField);
        delete fieldToSave.isNew;
        setFields((current) => editingField.isNew ? [...current, fieldToSave] : current.map((field) => field.id === fieldToSave.id ? fieldToSave : field));
        setSections((current) => editingField.isNew ? [...current.slice(0, -1), { ...current[current.length - 1], fields: [...current[current.length - 1].fields, { id: fieldToSave.id, visible: true, width: 'חצי רוחב' }] }] : current);
        setEditingField(fieldToSave);
        setDirty(true);
    };

    const deleteField = () => {
        if (!editingField || editingField.locked) return;
        setFields((current) => current.filter((field) => field.id !== editingField.id));
        setTableFields((current) => current.filter((id) => id !== editingField.id));
        setSections((current) => current.map((section) => ({ ...section, fields: section.fields.filter((field) => field.id !== editingField.id) })));
        setEditingField(null);
        setDirty(true);
    };

    const reorderField = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        setFields((current) => {
            const next = [...current];
            const from = next.findIndex((field) => field.id === draggedId);
            const to = next.findIndex((field) => field.id === targetId);
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
        setDirty(true);
        setDraggedId(null);
    };

    const saveAll = () => {
        setDirty(false);
        setSavedMessage('השינויים נשמרו זמנית בפרונטאנד');
        window.setTimeout(() => setSavedMessage(''), 2400);
    };

    const testParent = testField ? fieldById.get(testField.parentId) : null;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#EEF4FC] p-4" dir="rtl">
            <header className="mb-4 shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[26px] font-black tracking-tight text-slate-950">הגדרות מערכת - מנדיי</h1>
                        <p className="mt-2 text-sm font-semibold text-slate-500">בעמוד זה ניתן לערוך את השדות, התצוגה וההתנהגות של החדר.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {savedMessage && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600">{savedMessage}</span>}
                        <button type="button" onClick={saveAll} className={cn('flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-black shadow-[0_10px_22px_rgba(37,99,235,0.18)] transition', dirty ? 'bg-[#2563EB] text-white' : 'bg-white text-[#2563EB] border border-[#C9E1FF]')}>
                            שמור שינויים
                            <Icon name="check" className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <nav className="mt-5 flex flex-wrap items-center gap-7 border-b border-[#D7E7FF]">
                    {tabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn('relative pb-3 text-sm font-black transition', activeTab === tab.id ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-900')}>
                            {tab.label}
                            {activeTab === tab.id && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-[#2563EB]" />}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
                {activeTab === 'fields' && (
                    <div dir="ltr" className="mx-auto grid max-w-[1540px] gap-4 xl:grid-cols-[minmax(260px,0.85fr)_minmax(520px,1.75fr)_minmax(230px,0.7fr)]">
                        <SectionShell title="שדות פעילים" meta={`${fields.length} שדות`} className="min-h-0" >
                            <div dir="rtl" className="max-h-[650px] space-y-1.5 overflow-y-auto p-3">
                                {fields.map((field, index) => <ActiveFieldRow key={field.id} field={field} index={index} selected={selectedId === field.id} onSelect={() => selectField(field)} onDragStart={() => setDraggedId(field.id)} onDrop={() => reorderField(field.id)} />)}
                            </div>
                        </SectionShell>

                        <div dir="rtl">
                            <FieldEditor field={editingField} fields={fields} onChange={updateEditing} onSave={saveField} onDelete={deleteField} onCancel={() => setEditingField(null)} onOpenTest={() => setTestField(editingField)} />
                        </div>

                        <SectionShell title="בחרו תבנית" className="min-h-0">
                            <div dir="rtl" className="space-y-3 p-3">
                                {fieldTemplates.map((template) => <TemplateCard key={template.type} template={template} onCreate={createFromTemplate} />)}
                            </div>
                        </SectionShell>
                    </div>
                )}

                {activeTab === 'display' && <DisplaySettings fields={fields} tableFields={tableFields} setTableFields={setTableFields} sections={sections} setSections={setSections} />}
                {activeTab === 'general' && <GeneralSettings settings={generalSettings} setSettings={(updater) => { setDirty(true); setGeneralSettings(updater); }} />}
            </main>

            {testField && testParent && <BehaviorTestModal field={testField} parentField={testParent} onClose={() => setTestField(null)} />}
        </div>
    );
};

export default SettingsPage;
