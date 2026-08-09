import React, { useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryFormCanvas from '../../inquiries/layout/InquiryFormCanvas.jsx';
import InquiryFormField from '../../inquiries/layout/InquiryFormField.jsx';
import {
    applyInquiryFieldWidth,
    inquiryWidthShortLabel,
    inquiryWidthToGridSpan
} from '../../inquiries/layout/inquiryLayout.js';
import {
    createDefaultSections,
    isCanonicalIncidentDescriptionField,
    widthOptions
} from '../constants/settingsDefaults.js';

const join = (...values) => values.filter(Boolean).join(' ');
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const createId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;
const fieldVisible = (field) => field?.active !== false && field?.visible !== false;
const isDraftField = (field) => !field?.locked && String(field?.name || '').trim() === 'שדה חדש';
const isDisplayField = (field) => field && fieldVisible(field) && !isDraftField(field);
const normalizeWidth = (width, fallback = 'חצי רוחב') => widthOptions.includes(width) ? width : fallback;

const sampleValue = (field) => {
    if (field.type === 'date') return '2026-07-29';
    if (field.type === 'select' || field.type === 'multiselect') return field.options?.[0] || '';
    if (field.type === 'phone') return 'טלפון לדוגמה';
    if (field.id === 'customerId') return '123456789';
    if (field.id === 'status') return 'פתוחה';
    return '';
};

const sanitizeIds = (ids, fields) => {
    const valid = new Set(fields.map((field) => field.id));
    const seen = new Set();
    return (Array.isArray(ids) ? ids : []).filter((id) => valid.has(id) && !seen.has(id) && seen.add(id));
};

const normalizeSections = (sections, fields) => {
    const valid = new Set(fields.map((field) => field.id));
    const byId = new Map(fields.map((field) => [field.id, field]));
    const seen = new Set();
    const source = Array.isArray(sections) && sections.length ? sections : createDefaultSections(fields);
    return source.map((section, index) => ({
        id: String(section?.id || `display-section-${index + 1}`),
        title: String(section?.title || `מקטע ${index + 1}`).trim() || `מקטע ${index + 1}`,
        fields: (Array.isArray(section?.fields) ? section.fields : [])
            .filter((item) => item?.id && valid.has(item.id) && !seen.has(item.id) && seen.add(item.id))
            .map((item) => ({
                id: item.id,
                visible: item.visible !== false,
                width: normalizeWidth(item.width, byId.get(item.id)?.width)
            }))
    }));
};

const WidthSelector = ({ field, width, onChange }) => (
    <div className="flex h-7 items-center rounded-md bg-[var(--color-surface-muted)] p-0.5" aria-label={`רוחב ${field.name}`}>
        {widthOptions.map((option) => {
            const canonicalRestriction = isCanonicalIncidentDescriptionField(field) && option !== 'רוחב מלא';
            return (
                <button
                    key={option}
                    type="button"
                    disabled={canonicalRestriction}
                    aria-pressed={width === option}
                    data-testid={`layout-width-${field.id}-${inquiryWidthToGridSpan(option)}`}
                    onClick={() => onChange(option)}
                    className={join(
                        'h-6 rounded px-2 text-[10px] font-black transition focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-30',
                        width === option ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    )}
                >
                    {inquiryWidthShortLabel(option)}
                </button>
            );
        })}
    </div>
);

const LayoutFieldEditor = ({
    field,
    item,
    section,
    width,
    onWidth,
    onToggleVisible,
    onRemove,
    onDragStart,
    onDrop,
    onKeyboardMove
}) => (
    <div
        className={join(
            'group min-w-0 rounded-xl bg-[var(--color-surface-muted)] ring-1 ring-inset transition',
            item.visible ? 'ring-[var(--color-border)]' : 'opacity-55 ring-[var(--color-border-strong)]'
        )}
        data-testid={`layout-field-${field.id}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => onDrop(event, section.id, item.itemIndex)}
    >
        <div className="flex min-h-9 items-center justify-between gap-2 px-2 py-1">
            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-black text-[var(--color-text-primary)]" dir="auto">{field.name}</span>
            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    draggable
                    onDragStart={(event) => onDragStart(event, section.id, item.itemIndex, item.id)}
                    onKeyDown={(event) => onKeyboardMove(event, section.id, item.id)}
                    className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    aria-label={`גרירת ${field.name}; חיצים למעלה ולמטה משנים סדר`}
                >
                    <Icon name="grip" className="h-4 w-4" />
                </button>
                <WidthSelector field={field} width={width} onChange={(nextWidth) => onWidth(section.id, item.id, nextWidth)} />
                <button
                    type="button"
                    onClick={() => onToggleVisible(section.id, item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    title={item.visible ? 'הסתרה בתצוגת משתמש' : 'הצגה בתצוגת משתמש'}
                >
                    <Icon name={item.visible ? 'eye' : 'close'} className="h-3.5 w-3.5" />
                </button>
                {!field.locked && (
                    <button
                        type="button"
                        onClick={() => onRemove(section.id, item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                        title="הסרה מהתצוגה בלבד"
                    >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
        <InquiryFormField field={field} value={sampleValue(field)} preview hideLabel />
    </div>
);

const TableLayoutEditor = ({ fields, tableFields, setSettings }) => {
    const normalized = sanitizeIds(tableFields, fields).slice(0, 6);
    const byId = new Map(fields.map((field) => [field.id, field]));
    const available = fields.filter((field) => !normalized.includes(field.id));
    const [draggedIndex, setDraggedIndex] = useState(null);

    const update = (next) => setSettings((current) => ({ ...current, tableFields: sanitizeIds(next, fields).slice(0, 6) }));
    
    const move = (index, delta) => {
        const target = index + delta;
        if (target < 0 || target >= normalized.length) return;
        const next = [...normalized];
        [next[index], next[target]] = [next[target], next[index]];
        update(next);
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        const next = [...normalized];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, moved);
        update(next);
        setDraggedIndex(null);
    };

    return (
        <section className="mx-auto w-full max-w-[950px] space-y-6 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6 shadow-sm">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                    <h3 className="text-[16px] font-black text-[var(--color-text-primary)]">שדות בשורת פנייה</h3>
                    <p className="mt-1 text-[12px] font-semibold text-[var(--color-text-muted)]">גרור את הכרטיסים כדי לשנות את סדר העמודות בתצוגת הטבלה.</p>
                </div>
                <span className="flex h-8 items-center rounded-lg bg-[var(--color-primary-soft)] px-3 text-[12px] font-black text-[var(--color-primary)]">
                    {normalized.length} מתוך 6 עמודות
                </span>
            </header>

            {/* Live Preview Row */}
            <div className="space-y-2">
                <h4 className="text-[12px] font-bold text-[var(--color-text-muted)]">תצוגה מקדימה (איך זה ייראה בטבלה):</h4>
                <div className="flex h-[56px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 shadow-inner overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Icon name="hash" className="h-4 w-4" />
                    </div>
                    {normalized.map((id) => {
                        const field = byId.get(id);
                        if (!field) return null;
                        return (
                            <div key={`preview-${id}`} className="flex min-w-0 flex-1 items-center gap-2 border-r border-[var(--color-border)] pr-3 first:border-0 first:pr-0">
                                <span className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{field.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Horizontal Cards Editor */}
            <div className="flex flex-wrap gap-4 pt-2">
                {normalized.map((id, index) => {
                    const field = byId.get(id);
                    if (!field) return null;
                    return (
                        <div 
                            key={id}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, index)}
                            className="group relative flex w-[140px] cursor-grab flex-col items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md active:cursor-grabbing"
                        >
                            <span className="absolute -top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] shadow-sm">
                                {index + 1}
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                <Icon name="grip" className="h-5 w-5" />
                            </div>
                            <span className="w-full truncate text-center text-[13px] font-black text-[var(--color-text-primary)]" title={field.name}>
                                {field.name}
                            </span>
                            <div className="mt-2 flex w-full items-center justify-between border-t border-[var(--color-border)] pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <button type="button" disabled={index === normalized.length - 1} onClick={() => move(index, 1)} className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] rounded disabled:opacity-25"><Icon name="arrowRight" className="h-4 w-4" /></button>
                                <button type="button" onClick={() => update(normalized.filter((item) => item !== id))} className="p-1 text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 rounded transition"><Icon name="trash" className="h-4 w-4" /></button>
                                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] rounded disabled:opacity-25"><Icon name="arrowLeft" className="h-4 w-4" /></button>
                            </div>
                        </div>
                    );
                })}

                {normalized.length < 6 && (
                    <div className="flex w-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-transparent p-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                            <Icon name="plus" className="h-5 w-5" />
                        </div>
                        <select
                            defaultValue=""
                            onChange={(event) => {
                                if (event.target.value) update([...normalized, event.target.value]);
                                event.target.value = '';
                            }}
                            className="mt-3 w-full cursor-pointer bg-transparent text-center text-[12px] font-black text-[var(--color-primary)] outline-none"
                        >
                            <option value="" disabled hidden>הוסף עמודה</option>
                            {available.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </section>
    );
};

const InquiryLayoutBuilder = ({
    settings,
    setSettings,
    fields,
    tableFields,
    sections,
    saveStatus
}) => {
    const [surface, setSurface] = useState('details');
    const [viewMode, setViewMode] = useState('edit');
    const [collapsedSections, setCollapsedSections] = useState(() => new Set());
    const [draggedField, setDraggedField] = useState(null);
    const [draggedSectionId, setDraggedSectionId] = useState('');
    const displayFields = useMemo(() => fields.filter(isDisplayField), [fields]);
    const byId = useMemo(() => new Map(displayFields.map((field) => [field.id, field])), [displayFields]);
    const normalizedSections = useMemo(() => normalizeSections(sections, displayFields), [sections, displayFields]);
    const assignedIds = useMemo(() => new Set(normalizedSections.flatMap((section) => section.fields.map((item) => item.id))), [normalizedSections]);
    const previewValues = useMemo(() => Object.fromEntries(displayFields.map((field) => [field.id, sampleValue(field)])), [displayFields]);

    const updateSections = (updater) => setSettings((current) => {
        const currentFields = (current.fields || fields).filter(isDisplayField);
        const base = normalizeSections(current.sections, currentFields);
        const next = typeof updater === 'function' ? updater(base, currentFields) : updater;
        return { ...current, sections: normalizeSections(next, currentFields) };
    });

    const updateWidth = (_sectionId, fieldId, width) => setSettings((current) => (
        applyInquiryFieldWidth(current, fieldId, normalizeWidth(width))
    ));

    const toggleVisible = (sectionId, fieldId) => updateSections((current) => current.map((section) => section.id === sectionId
        ? { ...section, fields: section.fields.map((item) => item.id === fieldId ? { ...item, visible: !item.visible } : item) }
        : section));

    const removeField = (sectionId, fieldId) => updateSections((current) => current.map((section) => section.id === sectionId
        ? { ...section, fields: section.fields.filter((item) => item.id !== fieldId) }
        : section));

    const moveField = (source, targetSectionId, targetIndex) => updateSections((current) => {
        let moved;
        const withoutSource = current.map((section) => ({
            ...section,
            fields: section.fields.filter((item) => {
                if (section.id === source.sectionId && item.id === source.fieldId) {
                    moved = item;
                    return false;
                }
                return true;
            })
        }));
        if (!moved) return current;
        return withoutSource.map((section) => {
            if (section.id !== targetSectionId) return section;
            const fieldsInSection = [...section.fields];
            const index = Math.max(0, Math.min(targetIndex, fieldsInSection.length));
            fieldsInSection.splice(index, 0, moved);
            return { ...section, fields: fieldsInSection };
        });
    });

    const moveFieldByKeyboard = (event, sectionId, fieldId) => {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const section = normalizedSections.find((item) => item.id === sectionId);
        const index = section?.fields.findIndex((item) => item.id === fieldId) ?? -1;
        const target = index + (event.key === 'ArrowUp' ? -1 : 1);
        if (index >= 0 && target >= 0 && target < section.fields.length) moveField({ sectionId, fieldId }, sectionId, target);
    };

    const addSectionAfter = (index) => updateSections((current) => {
        const next = [...current];
        next.splice(index + 1, 0, { id: createId('section'), title: 'מקטע חדש', fields: [] });
        return next;
    });

    const reorderSection = (targetId) => {
        if (!draggedSectionId || draggedSectionId === targetId) return;
        updateSections((current) => {
            const next = [...current];
            const from = next.findIndex((section) => section.id === draggedSectionId);
            const to = next.findIndex((section) => section.id === targetId);
            if (from < 0 || to < 0) return current;
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
        setDraggedSectionId('');
    };

    const saveText = saveStatus === 'saving'
        ? 'שומר...'
        : saveStatus === 'error'
            ? 'השמירה נכשלה'
            : 'השינויים נשמרו באופן אוטומטי';

    return (
        <div className="space-y-4 pb-5">
            <section className="inquiry-panel mx-auto w-full max-w-[1120px] rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-[20px] font-black text-[var(--color-text-primary)]">עריכת תצורת פנייה</h2>
                        <p className="mt-1 text-[12px] font-semibold text-[var(--color-text-muted)]">ניהול מבנה השדות, הסדר והרוחב בקנה מידה זהה לחלון הפנייה.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setViewMode('edit')} className={join('inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-black transition', viewMode === 'edit' ? 'border-blue-600 bg-blue-600 text-white' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]')}><Icon name="settings" className="h-3.5 w-3.5" />עריכה פעילה</button>
                        <button type="button" onClick={() => setViewMode('user')} className={join('inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-black transition', viewMode === 'user' ? 'border-blue-600 bg-blue-600 text-white' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]')}><Icon name="eye" className="h-3.5 w-3.5" />תצוגת משתמש</button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                    <nav className="flex items-center gap-6">
                        <button type="button" onClick={() => setSurface('details')} className={join('relative pb-2 text-[12px] font-black', surface === 'details' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]')}>תצורת פנייה{surface === 'details' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />}</button>
                        <button type="button" onClick={() => setSurface('table')} className={join('relative pb-2 text-[12px] font-black', surface === 'table' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]')}>פנייה בטבלה{surface === 'table' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />}</button>
                    </nav>
                    <div className={join('flex items-center gap-2 text-[11px] font-bold', saveStatus === 'error' ? 'text-red-400' : saveStatus === 'saving' ? 'text-blue-400' : 'text-emerald-400')}>
                        <Icon name={saveStatus === 'error' ? 'close' : saveStatus === 'saving' ? 'clock' : 'check'} className="h-3.5 w-3.5" />
                        {saveText}
                    </div>
                </div>
            </section>

            {surface === 'table' ? (
                <TableLayoutEditor fields={displayFields} tableFields={tableFields} setSettings={setSettings} />
            ) : (
                <InquiryFormCanvas
                    fields={displayFields}
                    sections={normalizedSections}
                    values={previewValues}
                    preview
                    includeHidden={viewMode === 'edit'}
                    isSectionCollapsed={(sectionId) => viewMode === 'edit' && collapsedSections.has(sectionId)}
                    renderField={viewMode === 'edit' ? (item) => (
                        <LayoutFieldEditor
                            {...item}
                            item={item}
                            onWidth={updateWidth}
                            onToggleVisible={toggleVisible}
                            onRemove={removeField}
                            onKeyboardMove={moveFieldByKeyboard}
                            onDragStart={(event, sectionId, itemIndex, fieldId) => {
                                const source = { sectionId, itemIndex, fieldId };
                                setDraggedField(source);
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('application/x-tamar-layout-field', JSON.stringify(source));
                            }}
                            onDrop={(event, targetSectionId, targetIndex) => {
                                event.preventDefault();
                                let source = draggedField;
                                try {
                                    source = JSON.parse(event.dataTransfer.getData('application/x-tamar-layout-field')) || source;
                                } catch {}
                                if (source) moveField(source, targetSectionId, targetIndex);
                                setDraggedField(null);
                            }}
                        />
                    ) : undefined}
                    renderSectionHeader={viewMode === 'edit' ? ({ section, sectionIndex, items }) => (
                        <header
                            className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => reorderSection(section.id)}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <button
                                    type="button"
                                    draggable
                                    onDragStart={() => setDraggedSectionId(section.id)}
                                    onKeyDown={(event) => {
                                        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                                        event.preventDefault();
                                        const delta = event.key === 'ArrowUp' ? -1 : 1;
                                        updateSections((current) => {
                                            const next = [...current];
                                            const from = next.findIndex((item) => item.id === section.id);
                                            const target = from + delta;
                                            if (from < 0 || target < 0 || target >= next.length) return current;
                                            const [moved] = next.splice(from, 1);
                                            next.splice(target, 0, moved);
                                            return next;
                                        });
                                    }}
                                    className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                                    aria-label={`גרירת המקטע ${section.title}`}
                                >
                                    <Icon name="grip" className="h-4 w-4" />
                                </button>
                                <input
                                    value={section.title}
                                    onChange={(event) => updateSections((current) => current.map((item) => item.id === section.id ? { ...item, title: event.target.value } : item))}
                                    className="h-8 min-w-0 flex-1 bg-transparent text-right text-[14px] font-black text-[var(--color-text-primary)] outline-none focus:border-b focus:border-blue-500"
                                    aria-label="שם מקטע"
                                />
                                <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-black text-[var(--color-text-muted)]">{items.length} שדות</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setCollapsedSections((current) => { const next = new Set(current); if (next.has(section.id)) next.delete(section.id); else next.add(section.id); return next; })} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)]" title="כיווץ או הרחבה"><Icon name="chevronDown" className={join('h-3.5 w-3.5 transition', collapsedSections.has(section.id) && 'rotate-180')} /></button>
                                <button type="button" onClick={() => updateSections((current) => current.filter((item) => item.id !== section.id))} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400" title="מחיקת מקטע"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                            </div>
                        </header>
                    ) : undefined}
                    renderSectionFooter={viewMode === 'edit' ? ({ section }) => {
                        const available = displayFields.filter((field) => !assignedIds.has(field.id));
                        if (collapsedSections.has(section.id)) return null;
                        return (
                            <div
                                className="border-t border-[var(--color-border)] px-4 py-2"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    if (draggedField) moveField(draggedField, section.id, section.fields.length);
                                    setDraggedField(null);
                                }}
                            >
                                {available.length ? (
                                    <select
                                        defaultValue=""
                                        onChange={(event) => {
                                            const field = byId.get(event.target.value);
                                            if (field) updateSections((current) => current.map((item) => item.id === section.id ? { ...item, fields: [...item.fields, { id: field.id, visible: true, width: field.width || 'חצי רוחב' }] } : item));
                                            event.target.value = '';
                                        }}
                                        className="h-8 w-full rounded-lg border border-dashed border-[var(--color-border-strong)] bg-transparent px-3 text-[11px] font-bold text-[var(--color-primary)] outline-none"
                                    >
                                        <option value="">הוסף שדה קיים למקטע</option>
                                        {available.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                                    </select>
                                ) : <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)]">כל השדות כבר משויכים לתצורה.</p>}
                            </div>
                        );
                    } : undefined}
                    renderBetweenSections={viewMode === 'edit' ? ({ sectionIndex }) => (
                        <button type="button" onClick={() => addSectionAfter(sectionIndex)} className="mx-auto flex h-8 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-[11px] font-bold text-[var(--color-text-secondary)] transition hover:border-blue-500 hover:text-blue-400"><Icon name="plus" className="h-3.5 w-3.5" />הוסף מקטע כאן</button>
                    ) : undefined}
                />
            )}
        </div>
    );
};

export {
    normalizeSections as normalizeInquiryLayoutSections,
    sanitizeIds as sanitizeInquiryTableFieldIds
};
export default InquiryLayoutBuilder;

