import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';

const initialFields = [
    { id: 1, title: 'דחיפות', val: 'רמת דחיפות הפנייה', icon: 'chevronDown', type: 'select', required: true, locked: true, options: ['גבוהה', 'בינונית', 'נמוכה'] },
    { id: 2, title: 'גורם מטפל', val: 'בחר גורם מטפל', icon: 'chevronDown', type: 'select', required: true, locked: true, options: ['מנדי', 'צוות תשתיות'] },
    { id: 3, title: 'מ.א של לקוח', val: 'הכנס/י מספר לקוח', type: 'short_text', required: true, locked: true },
    { id: 4, title: 'אופן טיפול בפנייה', val: 'אופן טיפול בפנייה', type: 'free_text', required: true, locked: true },
    { id: 5, title: 'תיאור התקלה', val: 'תיאור התקלה', type: 'free_text', required: true, locked: true },
    { id: 6, title: 'מיקום', val: 'הכנס/י מיקום', type: 'short_text', required: false, locked: false, dashed: true }
];

const fieldTemplates = [
    {
        type: 'free_text',
        title: 'טקסט חופשי',
        description: 'שדה טקסט ארוך לתיאור פנייה, פתרון או הערה.',
        icon: 'list'
    },
    {
        type: 'select',
        title: 'בחירת אפשרות',
        description: 'רשימת אפשרויות כמו רשויות, חדרים או סטטוסים.',
        icon: 'chevronDown',
        options: ['אפשרות 1', 'אפשרות 2']
    },
    {
        type: 'short_text',
        title: 'טקסט קצר',
        description: 'שדה קצר לשם, מספר מזהה או ערך נקודתי.',
        icon: 'filePlus'
    }
];

const primaryTabs = [
    { id: 'fields', label: 'הגדרות פנייה' },
    { id: 'display', label: 'הגדרות תצוגה' },
    { id: 'general', label: 'הגדרות כלליות' }
];

const displayModes = [
    { id: 'card', label: 'תצורת פנייה' },
    { id: 'table', label: 'פנייה בטבלה' }
];

const typeDefaults = {
    free_text: {
        title: 'טקסט חופשי חדש',
        val: 'לדוגמה: תיאור פנייה, דרך פתרון...',
        icon: null,
        options: []
    },
    select: {
        title: 'בחירת אפשרות חדשה',
        val: 'לדוגמה: רשימת יחידות...',
        icon: 'chevronDown',
        options: ['אפשרות 1', 'אפשרות 2']
    },
    short_text: {
        title: 'טקסט קצר חדש',
        val: 'לדוגמה: שם פרטי, שם משפחה...',
        icon: null,
        options: []
    }
};

const widthOptions = ['רוחב מלא', 'חצי רוחב', 'שליש רוחב'];

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('fields');
    const [displayMode, setDisplayMode] = useState('card');
    const [activeFields, setActiveFields] = useState(initialFields);
    const [editingField, setEditingField] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState(null);

    const handleFieldTypeClick = (type) => {
        const defaults = typeDefaults[type];

        setEditingField({
            id: Date.now(),
            isNew: true,
            type,
            title: defaults.title,
            val: defaults.val,
            required: false,
            locked: false,
            icon: defaults.icon,
            options: defaults.options,
            displayWidth: 'חצי רוחב'
        });
        setIsDropdownOpen(false);
    };

    const handleEditExisting = (field) => {
        const options = field.options || (field.type === 'select' ? ['אפשרות לדוגמה'] : []);
        setEditingField({ ...field, isNew: false, options, displayWidth: field.displayWidth || 'חצי רוחב' });
        setIsDropdownOpen(false);
    };

    const handleSave = () => {
        if (!editingField) return;

        if (editingField.isNew) {
            const newField = { ...editingField, dashed: false };
            delete newField.isNew;
            setActiveFields((fields) => [...fields, newField]);
        } else {
            setActiveFields((fields) => fields.map((field) => field.id === editingField.id ? { ...editingField } : field));
        }
        setEditingField(null);
    };

    const handleDelete = () => {
        if (!editingField || editingField.locked || editingField.isNew) return;
        setActiveFields((fields) => fields.filter((field) => field.id !== editingField.id));
        setEditingField(null);
    };

    const updateOption = (index, value) => {
        setEditingField((field) => {
            if (!field) return field;
            const options = [...field.options];
            options[index] = value;
            return { ...field, options };
        });
    };

    const addOption = () => {
        setEditingField((field) => field ? { ...field, options: [...field.options, `אפשרות ${field.options.length + 1}`] } : field);
    };

    const removeOption = (index) => {
        setEditingField((field) => field ? { ...field, options: field.options.filter((_, optionIndex) => optionIndex !== index) } : field);
    };

    const handleDragStart = (event, id) => {
        setDraggedItemId(id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => event.target.classList.add('opacity-40'), 0);
    };

    const handleDragEnd = (event) => {
        event.target.classList.remove('opacity-40');
        setDraggedItemId(null);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (event, targetId) => {
        event.preventDefault();
        if (draggedItemId === null || draggedItemId === targetId) return;

        setActiveFields((fields) => {
            const oldIndex = fields.findIndex((field) => field.id === draggedItemId);
            const newIndex = fields.findIndex((field) => field.id === targetId);
            const newFields = [...fields];
            const [movedItem] = newFields.splice(oldIndex, 1);
            newFields.splice(newIndex, 0, movedItem);
            return newFields;
        });
    };

    const renderFieldEditor = () => {
        if (!editingField) {
            return (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-dashed border-blue-200 bg-white/70 p-8 text-center text-slate-400">
                    <div className="mb-4 rounded-3xl bg-blue-50 p-4 text-blue-500">
                        <Icon name="settings" className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">בחרו שדה לעריכה</h3>
                    <p className="mt-2 max-w-[320px] text-sm font-semibold leading-6">לחצו על שדה פעיל או צרו שדה חדש מתבנית כדי לערוך את הכותרת, החובה, האפשרויות והתלות.</p>
                </div>
            );
        }

        return (
            <section className="flex h-full min-h-0 flex-col rounded-[26px] border border-blue-100 bg-white shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-950">{editingField.isNew ? 'הגדרת שדה חדש' : 'עריכת שדה פעיל'}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-400">כל שינוי נשמר לאחר לחיצה על שמור שדה</p>
                    </div>
                    <button type="button" onClick={() => setEditingField(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-blue-200 hover:text-blue-600">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-800">כותרת השדה</span>
                            <input
                                className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                value={editingField.title}
                                onChange={(event) => setEditingField({ ...editingField, title: event.target.value })}
                                placeholder="הכנס שם שדה..."
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-800">טקסט מנחה</span>
                            <input
                                className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                value={editingField.val}
                                onChange={(event) => setEditingField({ ...editingField, val: event.target.value })}
                                placeholder="Placeholder שיופיע בטופס..."
                            />
                        </label>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-black text-slate-800">חובה?</div>
                                    <div className="text-xs font-semibold text-slate-400">סימון כוכבית בטופס הפנייה</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingField({ ...editingField, required: !editingField.required })}
                                    className={`flex h-6 w-11 items-center rounded-full p-1 transition ${editingField.required ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`h-4 w-4 rounded-full bg-white shadow transition ${editingField.required ? '-translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-xs font-black text-slate-500">רוחב בתצוגה</span>
                                <select
                                    value={editingField.displayWidth || 'חצי רוחב'}
                                    onChange={(event) => setEditingField({ ...editingField, displayWidth: event.target.value })}
                                    className="h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                                >
                                    {widthOptions.map((option) => <option key={option}>{option}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="text-sm font-black text-slate-800">תלות בשדה אחר</div>
                            <p className="mt-1 text-xs font-semibold text-slate-400">אופציונלי - הצגה לפי בחירה משדה קודם</p>
                            <select className="mt-3 h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                                <option>ללא תלות</option>
                                {activeFields.filter((field) => field.id !== editingField.id).map((field) => <option key={field.id}>{field.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {editingField.type === 'select' && (
                        <div className="relative mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">אפשרויות בחירה</h4>
                                    <p className="text-xs font-semibold text-slate-400">ערכו את האפשרויות שיוצגו למשתמש</p>
                                </div>
                                <button type="button" onClick={() => setIsDropdownOpen((value) => !value)} className="flex h-9 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-xs font-black text-blue-600">
                                    תצוגה מקדימה
                                    <Icon name="chevronDown" className={`h-3 w-3 transition ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {isDropdownOpen && (
                                <div className="mb-3 rounded-xl border border-blue-100 bg-white p-2 text-xs font-bold text-slate-500 shadow-sm">
                                    {editingField.options.map((option) => <div key={option} className="rounded-lg px-2 py-1.5 hover:bg-blue-50">{option}</div>)}
                                </div>
                            )}

                            <div className="space-y-2">
                                {editingField.options.map((option, index) => (
                                    <div key={`${option}-${index}`} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                                        <input
                                            className="h-9 flex-1 rounded-lg border border-slate-100 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                                            value={option}
                                            onChange={(event) => updateOption(index, event.target.value)}
                                        />
                                        <button type="button" onClick={() => removeOption(index)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                                            <Icon name="trash" className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addOption} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-white px-3 py-2 text-sm font-black text-blue-600 transition hover:bg-blue-50">
                                <Icon name="plus" className="h-4 w-4" />
                                הוסף אפשרות בחירה
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-4">
                    <button type="button" onClick={handleSave} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700">
                        שמור שדה פעיל
                    </button>
                    {!editingField.isNew && !editingField.locked && (
                        <button type="button" onClick={handleDelete} className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100">
                            <Icon name="trash" className="h-4 w-4" />
                            מחק שדה
                        </button>
                    )}
                </div>
            </section>
        );
    };

    const renderFieldSettings = () => (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(420px,1fr)_360px]">
            <aside className="min-h-0 rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.07)]">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-950">שדות חדר</h2>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">{fieldTemplates.length} תבניות</span>
                </div>
                <div className="space-y-3">
                    {fieldTemplates.map((template) => (
                        <button
                            key={template.type}
                            type="button"
                            onClick={() => handleFieldTypeClick(template.type)}
                            className="group w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50/30 p-4 text-right transition hover:border-blue-400 hover:bg-blue-50"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-black text-slate-800">{template.title}</div>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{template.description}</p>
                                </div>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-500 shadow-sm">
                                    <Icon name={template.icon} className="h-4 w-4" />
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            <div className="min-h-0">{renderFieldEditor()}</div>

            <aside className="flex min-h-0 flex-col rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.07)]">
                <div className="mb-4 flex shrink-0 items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-950">שדות פעילים</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-400">גררו כדי לשנות סדר הופעה</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{activeFields.length}/10</span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-3">
                        {activeFields.map((field, index) => {
                            const isEditingThis = editingField && editingField.id === field.id;

                            return (
                                <div
                                    key={field.id}
                                    draggable
                                    onDragStart={(event) => handleDragStart(event, field.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                    onDrop={(event) => handleDrop(event, field.id)}
                                    className="group flex items-center gap-3"
                                    title="גרור כדי לשנות סדר"
                                >
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm ${isEditingThis ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>{index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleEditExisting(field)}
                                        className={`relative min-w-0 flex-1 rounded-2xl border p-3 text-right transition ${field.dashed ? 'border-dashed border-slate-300 bg-slate-50/50' : 'border-slate-100 bg-white shadow-sm'} ${isEditingThis ? 'border-blue-500 ring-2 ring-blue-100' : 'hover:border-blue-300'}`}
                                    >
                                        <Icon name="grip" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-sm font-black text-slate-800">{field.title}</span>
                                            {field.required && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-500">חובה</span>}
                                        </div>
                                        <div className="mt-1 truncate text-xs font-semibold text-slate-400">{field.val}</div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>
        </div>
    );

    const renderDisplaySettings = () => (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(420px,1fr)_minmax(520px,1.35fr)]">
            <section className="flex min-h-0 flex-col rounded-[26px] border border-blue-100 bg-white shadow-[0_14px_34px_rgba(37,99,235,0.07)]">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-950">תצוגה מקדימה</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-400">כך הפנייה תוצג בממשק</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">M-16-338</span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F8FF] p-5">
                    {displayMode === 'card' ? (
                        <div className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-600">פתוחה</span>
                                    <span className="rounded-lg bg-pink-50 px-3 py-1 text-xs font-black text-pink-600">נמוכה-3</span>
                                </div>
                                <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 text-blue-500">
                                    <Icon name="close" className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {activeFields.slice(0, 6).map((field) => (
                                    <div key={field.id} className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                                        <div className="text-xs font-bold text-slate-400">{field.title}</div>
                                        <div className="mt-1 text-sm font-black text-slate-900">{field.val || '[ערך לדוגמה]'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-sm">
                            <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
                                {activeFields.slice(0, 4).map((field) => <span key={field.id}>{field.title}</span>)}
                            </div>
                            <div className="grid grid-cols-4 px-4 py-4 text-sm font-bold text-slate-700">
                                {activeFields.slice(0, 4).map((field) => <span key={field.id}>{field.val || '[ערך]'}</span>)}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-[26px] border border-blue-100 bg-white shadow-[0_14px_34px_rgba(37,99,235,0.07)]">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-950">עריכת תצורת פנייה</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-400">סדרו מקטעים ושדות כפי שיופיעו בחלון פנייה</p>
                    </div>
                    <div className="flex rounded-xl bg-slate-100 p-1">
                        {displayModes.map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setDisplayMode(mode.id)}
                                className={`rounded-lg px-4 py-2 text-sm font-black transition ${displayMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="mb-4 flex items-center justify-center">
                        <button type="button" className="rounded-full border border-dashed border-blue-200 bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
                            <Icon name="plus" className="ml-1 inline h-4 w-4" />
                            הוסף מקטע כאן
                        </button>
                    </div>

                    {['מידע קריטי', 'מידע נלווה', 'תיאור הפנייה', 'שדות נוספים'].map((sectionTitle, sectionIndex) => (
                        <div key={sectionTitle} className="mb-4 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                                    <Icon name={sectionIndex === 0 ? 'target' : 'list'} className="h-4 w-4 text-blue-500" />
                                    {sectionTitle}
                                </div>
                                <span className="text-xs font-bold text-slate-400">{sectionIndex === 2 ? 1 : 4} שדות מוצגים</span>
                            </div>
                            <div className="grid gap-3 p-4 md:grid-cols-2">
                                {activeFields.slice(sectionIndex, sectionIndex + (sectionIndex === 2 ? 1 : 4)).map((field) => (
                                    <div key={`${sectionTitle}-${field.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                                        <span className="text-sm font-bold text-slate-800">{field.title}</span>
                                        <select className="h-8 rounded-lg border border-slate-100 bg-slate-50 px-2 text-xs font-bold text-slate-600">
                                            {widthOptions.map((option) => <option key={option}>{option}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
                                <button className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">הוסף שדה למקטע</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

    const renderGeneralSettings = () => (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
            {[
                ['שם החדר', 'מנדי', 'building'],
                ['שפת ברירת מחדל', 'עברית', 'globe'],
                ['הרשאות עריכה', 'מנהלי חדר בלבד', 'users']
            ].map(([title, value, icon]) => (
                <section key={title} className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_14px_34px_rgba(37,99,235,0.07)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Icon name={icon} className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm font-bold text-slate-500">{value}</p>
                </section>
            ))}
        </div>
    );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#EEF4FC] p-4" dir="rtl">
            <header className="mb-4 shrink-0 rounded-[26px] border border-blue-100 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(37,99,235,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icon name="settings" className="h-5 w-5 text-blue-600" />
                            <h1 className="text-[26px] font-black tracking-tight text-slate-950">הגדרות מערכת - מנדי</h1>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-500">בעמוד זה ניתן לערוך את שדות החדר, תצורת התצוגה והגדרות כלליות.</p>
                    </div>
                    <button type="button" className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
                        שמור שינויים
                        <Icon name="check" className="h-4 w-4" />
                    </button>
                </div>

                <nav className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    {primaryTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm ring-2 ring-slate-950' : 'bg-slate-50 text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'fields' && renderFieldSettings()}
                {activeTab === 'display' && renderDisplaySettings()}
                {activeTab === 'general' && renderGeneralSettings()}
            </main>
        </div>
    );
};

export default SettingsPage;
