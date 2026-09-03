
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageLoadingState.jsx';
import { useRoomSettings } from '../../features/settings/hooks/useRoomSettings.js';
import InquiryLayoutBuilder from '../../features/settings/components/InquiryLayoutBuilder.jsx';
import { useSessionStore } from '../../store/session.store.js';
import {
    cloneSettingsField,
    createDefaultSections,
    defaultInquiryFields,
    fieldTemplates,
    isCanonicalIncidentDescriptionField,
    summarizeIncidentTemplate,
    widthOptions
} from '../../features/settings/constants/settingsDefaults.js';
import { closeSoundOptions, notificationSoundService } from '../../features/tickets/services/notificationSoundService.js';

const tabs = [
    { id: 'fields', label: 'הגדרות פנייה' },
    { id: 'display', label: 'הגדרות תצוגה' },
    { id: 'general', label: 'הגדרות כלליות' }
];
const displayTabs = [{ id: 'row', label: 'שורת פנייה' }, { id: 'details', label: 'פרטי פנייה' }];
const compactFieldTemplates = [
    { type: 'longtext', name: 'טקסט חופשי', example: 'לדוגמה: תיאור פנייה, דרך פתרון...', icon: 'list' },
    { type: 'select', name: 'בחירת אפשרות', example: 'לדוגמה: רשימת רשויות, יחידות...', icon: 'chevronDown' },
    { type: 'text', name: 'טקסט קצר', example: 'לדוגמה: שם פרטי, שם משפחה...', icon: 'filePlus' }
];
const selectorTypes = new Set(['select', 'multiselect']);
const cn = (...values) => values.filter(Boolean).join(' ');
const unique = (values) => [...new Set(values.filter(Boolean))];
const typeById = Object.fromEntries(fieldTemplates.map((item) => [item.type, item]));
const inputClass = 'inquiry-input-surface h-9 w-full rounded-xl px-3 text-right text-[13px] font-bold outline-none transition focus:border-[var(--color-primary)]';
const textareaClass = 'inquiry-input-surface min-h-[76px] w-full resize-y rounded-xl px-3 py-2 text-right text-[13px] font-semibold leading-6 outline-none transition focus:border-[var(--color-primary)]';

const getTypeLabel = (field) => field?.typeLabel || typeById[field?.type]?.typeLabel || typeById[field?.type]?.name || 'שדה';
const fieldVisible = (field) => field?.active !== false && field?.visible !== false;
const getScopeLabel = (scope) => ({ system: 'מערכת', environment: 'סביבה', subEnvironment: 'תת-סביבה', room: 'חדר' }[scope] || 'חדר');
const getGroupLabel = (group) => group === 'system' ? 'שדות מערכת' : 'שדות חדר';
const isValidParent = (field) => selectorTypes.has(field?.type) && fieldVisible(field);
const createsCycle = (fields, childId, parentId) => {
    let cursor = parentId;
    const visited = new Set();
    while (cursor) {
        if (cursor === childId || visited.has(cursor)) return true;
        visited.add(cursor);
        cursor = fields.find((field) => field.id === cursor)?.parentId;
    }
    return false;
};
const createRuntimeId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;
const makeFieldId = (type) => createRuntimeId(`field-${type}`);
const getSampleValue = (field) => {
    if (!field) return '-';
    if (field.type === 'link') return field.linkConfig?.label || field.name;
    if (field.type === 'date') return 'תאריך לדוגמה';
    if (field.type === 'multiselect') return (field.options || []).slice(0, 2).join(', ') || 'אפשרות לדוגמה';
    if (field.type === 'select') return (field.options || [])[0] || 'אפשרות לדוגמה';
    return field.placeholder || 'ערך לדוגמה';
};

const ToolbarButton = ({ children, icon, onClick, tone = 'default', disabled, title }) => {
    const tones = {
        default: 'inquiry-control inquiry-secondary-text hover:border-[var(--color-primary)]',
        primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
        danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300',
        soft: 'border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
    };
    return <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title || (typeof children === 'string' ? children : undefined)} className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-[12px] font-black transition focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-45', tones[tone])}>{icon && <Icon name={icon} className="h-4 w-4" />}{children}</button>;
};

const CompactCheckbox = ({ checked, onChange, label, disabled }) => (
    <label className={cn('inline-flex items-center gap-2 text-[11px] font-bold text-[var(--color-text-secondary)]', disabled && 'cursor-not-allowed opacity-60')}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] accent-blue-600" />
        <span>{label}</span>
    </label>
);

const ToggleSwitch = ({ checked, onChange, label, description, disabled }) => (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 transition', disabled && 'cursor-not-allowed opacity-60')}>
        <span className={cn('relative mt-0.5 h-6 w-11 rounded-full border transition', checked ? 'border-blue-600 bg-blue-600' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]')}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'right-5' : 'right-0.5')} />
        </span>
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-black text-[var(--color-text-primary)]">{label}</span>{description && <span className="mt-1 block text-[11px] font-semibold leading-5 text-[var(--color-text-muted)]">{description}</span>}</span>
    </label>
);

const SectionShell = ({ title, meta, children, className = '', actions }) => (
    <section className={cn('inquiry-panel flex min-h-0 flex-col overflow-hidden rounded-2xl', className)}>
        <div className="flex min-h-[38px] shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2">
            <div className="min-w-0"><h2 className="truncate text-[15px] font-black text-[var(--color-text-primary)]">{title}</h2>{meta && <p className="mt-0.5 text-[11px] font-bold text-[var(--color-text-muted)]">{meta}</p>}</div>{actions}
        </div>
        {children}
    </section>
);


const EditorSection = ({ title, description, children }) => <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5"><div className="mb-1.5"><h3 className="text-[14px] font-black text-[var(--color-text-primary)]">{title}</h3>{description && <p className="mt-0.5 text-[11px] font-semibold leading-5 text-[var(--color-text-muted)]">{description}</p>}</div>{children}</section>;
const FieldLabel = ({ label, help, children }) => <label className="block min-w-0 text-right"><span className="block text-[12px] font-black text-[var(--color-text-secondary)]">{label}</span>{help && <span className="mt-1 block text-[11px] font-semibold leading-5 text-[var(--color-text-muted)]">{help}</span>}<span className="mt-1.5 block">{children}</span></label>;
const EmptyState = ({ icon = 'settings', title, text }) => <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-5 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon name={icon} className="h-6 w-6" /></span><h3 className="text-[17px] font-black text-[var(--color-text-primary)]">{title}</h3><p className="mt-2 max-w-md text-[13px] font-semibold leading-6 text-[var(--color-text-muted)]">{text}</p></div>;

const ScopeControls = ({ settings, setSettings, compact = false }) => {
    const mode = settings.scope?.mode || 'local';
    const setMode = (nextMode) => setSettings((current) => ({ ...current, scope: { ...(current.scope || {}), level: 'room', inheritedFrom: 'subEnvironment', mode: nextMode } }));
    return <div className={cn('rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]', compact ? 'p-2' : 'p-3')}><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[12px] font-black text-[var(--color-text-primary)]">טווח והורשה</div><div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{mode === 'inherit' ? 'בירושה מהתת-סביבה' : 'הגדרה מקומית לחדר מנדי'}</div></div><div className="flex gap-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1"><button type="button" onClick={() => setMode('inherit')} className={cn('rounded-lg px-3 py-1.5 text-[11px] font-black transition', mode === 'inherit' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}>השתמשו בהגדרת האב</button><button type="button" onClick={() => setMode('local')} className={cn('rounded-lg px-3 py-1.5 text-[11px] font-black transition', mode === 'local' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}>יצירת התאמה מקומית</button></div></div></div>;
};

const TemplateCard = ({ template, onCreate }) => (
    <button type="button" onClick={() => onCreate(template)} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-right shadow-sm transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">
        <div className="flex items-center justify-between gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon name={template.icon} className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-black text-[var(--color-text-primary)]">{template.name}</div>
                <div className="mt-1 truncate text-[11px] font-semibold text-[var(--color-text-muted)]">{template.example}</div>
            </div>
        </div>
    </button>
);

const TemplatePanel = ({ onCreate }) => (
    <SectionShell title="בחרו תבנית" className="h-full max-h-[560px]">
        <div dir="rtl" className="space-y-1.5 overflow-y-auto p-1.5">
            {compactFieldTemplates.map((template) => <TemplateCard key={template.type} template={template} onCreate={onCreate} />)}
        </div>
    </SectionShell>
);

const FieldActionsMenu = ({ field, onDuplicate, onToggleActive, onDelete }) => {
    const [open, setOpen] = useState(false);
    return <div className="relative"><button type="button" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]" aria-label={`פעולות עבור ${field.name}`}><Icon name="settings" className="h-4 w-4" /></button>{open && <div className="inquiry-menu-surface absolute left-0 top-full z-40 mt-1 w-44 rounded-2xl p-1 text-right shadow-xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setOpen(false); onDuplicate(field); }} className="inquiry-menu-item flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-black"><Icon name="copy" className="h-3.5 w-3.5" />שכפול</button><button type="button" onClick={() => { setOpen(false); onToggleActive(field); }} className="inquiry-menu-item flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-black"><Icon name={fieldVisible(field) ? 'eye' : 'close'} className="h-3.5 w-3.5" />{fieldVisible(field) ? 'הסתרה' : 'הצגה'}</button><button type="button" disabled={field.locked} title={field.locked ? 'שדה מערכת מוגן ואינו ניתן למחיקה' : 'מחיקה'} onClick={() => { setOpen(false); onDelete(field); }} className="inquiry-menu-item flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-black text-red-600 disabled:cursor-not-allowed disabled:opacity-45"><Icon name="trash" className="h-3.5 w-3.5" />מחיקה</button></div>}</div>;
};

const ActiveFieldCard = ({ field, index, selected, onSelect, onDragStart, onDrop, onMove, onDuplicate, onToggleActive, onDelete }) => {
    const metadata = [field.required ? 'חובה' : 'רשות', getTypeLabel(field), field.parentId ? 'תלוי בשדה אחר' : '', getScopeLabel(field.scope)].filter(Boolean).join(' ? ');
    const selectField = () => onSelect(field);
    const handleKeyboardSelect = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectField();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            draggable
            onDragStart={onDragStart}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onClick={selectField}
            onKeyDown={handleKeyboardSelect}
            className={cn(
                'group grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border px-2.5 py-2 text-right transition focus:outline-none focus:ring-2 focus:ring-blue-400/30',
                selected ? 'border-blue-600 bg-[var(--color-primary-soft)] shadow-sm' : 'border-transparent bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]'
            )}
        >
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black', selected ? 'bg-blue-600 text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]')}>{index + 1}</span>
            <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                    <Icon name="grip" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                    <span title={field.name} className="truncate text-[13px] font-black text-[var(--color-text-primary)]">{field.name}</span>
                    {!fieldVisible(field) && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-700 dark:text-slate-300">מוסתר</span>}
                    {field.locked && <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">מוגן</span>}
                </span>
                <span className="mt-1 block truncate text-[11px] font-bold text-[var(--color-text-muted)]">{metadata}</span>
            </span>
            <span className="flex items-center gap-1">
                <span className="hidden gap-0.5 opacity-0 transition group-hover:flex group-hover:opacity-100">
                    <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onMove(field.id, -1); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]" aria-label="העבר למעלה"><Icon name="arrowUpStraight" className="h-3.5 w-3.5" /></span>
                    <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onMove(field.id, 1); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]" aria-label="העבר למטה"><Icon name="arrowDownStraight" className="h-3.5 w-3.5" /></span>
                </span>
                <FieldActionsMenu field={field} onDuplicate={onDuplicate} onToggleActive={onToggleActive} onDelete={onDelete} />
            </span>
        </div>
    );
};
const ActiveFieldsPanel = ({ fields, selectedId, query, setQuery, onSelect, onReorder, onMove, onDuplicate, onToggleActive, onDelete }) => {
    const [draggedId, setDraggedId] = useState(null);
    const filtered = fields.filter((field) => field.name.includes(query) || getTypeLabel(field).includes(query) || getGroupLabel(field.group).includes(query));
    return <SectionShell title="שדות פעילים" meta={`${fields.length} שדות`} className="h-full max-h-[560px]" actions={<span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--color-primary)]">{filtered.length}</span>}>
        {/* <div className="relative"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש שדה" className={`${inputClass} pr-9`} /><Icon name="search" className="absolute right-3 top-3 h-4 w-4 text-[var(--color-primary)]" /></div> */}
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">{filtered.map((field) => <ActiveFieldCard key={field.id} field={field} index={fields.findIndex((item) => item.id === field.id)} selected={selectedId === field.id} onSelect={onSelect} onDragStart={() => setDraggedId(field.id)} onDrop={() => { onReorder(draggedId, field.id); setDraggedId(null); }} onMove={onMove} onDuplicate={onDuplicate} onToggleActive={onToggleActive} onDelete={onDelete} />)}{!filtered.length && <EmptyState icon="search" title="לא נמצאו שדות" text="נסו לחפש לפי שם, סוג או קבוצה." />}</div></SectionShell>;
};

const compactOptionInputClass = 'min-w-0 flex-1 bg-transparent text-right text-[11px] font-black text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]';
const optionActionButtonClass = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)] disabled:opacity-35';

const OptionEditor = ({ field, onAdd, onRename, onDelete, onMove, compact = false }) => {
    const options = field.options || [];
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [showOverflowOptions, setShowOverflowOptions] = useState(false);
    const [showFullManager, setShowFullManager] = useState(false);
    const add = () => {
        const value = draft.trim();
        if (!value) return setError('יש להזין שם אפשרות.');
        if (options.includes(value)) return setError('אפשרות בשם הזה כבר קיימת.');
        onAdd(field.id, value); setDraft(''); setError('');
    };
    const visibleOptions = compact ? options.slice(0, 6) : options;
    const hiddenOptions = compact ? options.slice(6) : [];
    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[12px] font-black text-[var(--color-text-primary)]">אפשרויות בחירה</h3>
                    <button type="button" onClick={() => setShowFullManager((current) => !current)} className="text-[11px] font-bold text-[var(--color-primary)] transition hover:opacity-80">
                        {showFullManager ? 'סגור עריכה' : 'הוסף'}
                    </button>
                </div>
                <div className="relative flex flex-wrap items-center gap-1.5">
                    {visibleOptions.map((option) => (
                        <span key={option} className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-[11px] font-semibold text-[var(--color-text-primary)] shadow-sm">
                            <span className="truncate">{option}</span>
                            <button type="button" onClick={() => onDelete(field.id, option)} className="text-[var(--color-text-muted)] transition hover:text-red-500" aria-label={`הסר ${option}`}>
                                <Icon name="close" className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {hiddenOptions.length > 0 && (
                        <div className="relative">
                            <button type="button" onClick={() => setShowOverflowOptions((current) => !current)} className={cn('inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-bold shadow-sm transition', showOverflowOptions ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')}>
                                + {hiddenOptions.length} נוספות
                            </button>
                            {showOverflowOptions && <div className="absolute right-0 top-full z-10 mt-1.5 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-xl">{hiddenOptions.map((option) => <div key={option} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"><span className="truncate">{option}</span><button type="button" onClick={() => onDelete(field.id, option)} className="text-[var(--color-text-muted)] transition hover:text-red-500" aria-label={`הסר ${option}`}><Icon name="close" className="h-3 w-3" /></button></div>)}</div>}
                        </div>
                    )}
                </div>
                {showFullManager && <div className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add(); }} placeholder="אפשרות חדשה" className={cn(inputClass, 'h-8 rounded-lg text-[12px]')} />
                        <ToolbarButton icon="plus" tone="primary" onClick={add}>הוספה</ToolbarButton>
                    </div>
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
                    <div className="grid gap-1 sm:grid-cols-2">
                        {options.map((option, index) => <div key={`${option}-${index}`} className="grid h-8 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"><Icon name="grip" className="h-3 w-3" /></span><input value={option} onChange={(event) => onRename(field.id, option, event.target.value)} className={compactOptionInputClass} aria-label={`אפשרות ${index + 1}`} /><span className="flex gap-0.5"><button type="button" onClick={() => onMove(field.id, index, -1)} disabled={index === 0} className={optionActionButtonClass} aria-label="העבר אפשרות למעלה"><Icon name="arrowUpStraight" className="h-3 w-3" /></button><button type="button" onClick={() => onMove(field.id, index, 1)} disabled={index === options.length - 1} className={optionActionButtonClass} aria-label="העבר אפשרות למטה"><Icon name="arrowDownStraight" className="h-3 w-3" /></button><button type="button" onClick={() => onDelete(field.id, option)} className="flex h-6 w-6 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10" aria-label="מחיקת אפשרות"><Icon name="trash" className="h-3 w-3" /></button></span></div>)}
                    </div>
                </div>}
                {!options.length && <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] p-2 text-center text-[12px] font-bold text-[var(--color-text-muted)]">לא הוגדרו אפשרויות עדיין.</div>}
            </div>
        );
    }
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-[180px]">
                    <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">אפשרויות בחירה</h3>
                    <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">נשמרות לפי הסדר ומשמשות גם לתלויות.</p>
                </div>
                <div className="flex min-w-[240px] flex-1 gap-1.5 sm:max-w-[360px]">
                    <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') add(); }}
                        placeholder="אפשרות חדשה"
                        className={cn(inputClass, 'h-8 rounded-lg text-[12px]')}
                    />
                    <ToolbarButton icon="plus" tone="primary" onClick={add}>הוספה</ToolbarButton>
                </div>
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
            <div className="grid max-h-[124px] gap-1.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                {options.map((option, index) => (
                    <div key={`${option}-${index}`} className="grid h-8 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"><Icon name="grip" className="h-3 w-3" /></span>
                        <input value={option} onChange={(event) => onRename(field.id, option, event.target.value)} className={compactOptionInputClass} aria-label={`אפשרות ${index + 1}`} />
                        <span className="flex gap-0.5">
                            <button type="button" onClick={() => onMove(field.id, index, -1)} disabled={index === 0} className={optionActionButtonClass} aria-label="העבר אפשרות למעלה"><Icon name="arrowUpStraight" className="h-3 w-3" /></button>
                            <button type="button" onClick={() => onMove(field.id, index, 1)} disabled={index === options.length - 1} className={optionActionButtonClass} aria-label="העבר אפשרות למטה"><Icon name="arrowDownStraight" className="h-3 w-3" /></button>
                            <button type="button" onClick={() => onDelete(field.id, option)} className="flex h-6 w-6 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10" aria-label="מחיקת אפשרות"><Icon name="trash" className="h-3 w-3" /></button>
                        </span>
                    </div>
                ))}
                {!options.length && <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] p-2 text-center text-[12px] font-bold text-[var(--color-text-muted)] sm:col-span-2 xl:col-span-3">לא הוגדרו אפשרויות עדיין.</div>}
            </div>
        </div>
    );
};
const dependencyInputClass = 'inquiry-input-surface h-7 w-full rounded-lg px-2 text-right text-[11px] font-bold outline-none transition focus:border-[var(--color-primary)]';

const DependencyPreview = ({ field, parentField }) => {
    const [parentValue, setParentValue] = useState('');
    const options = parentValue ? (field.dependencyMap?.[parentValue] || []) : [];
    return (
        <div className="grid items-end gap-1 md:grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)]">
            <label className="min-w-0">
                <span className="mb-0.5 block text-[10px] font-black text-[var(--color-text-secondary)]">{parentField.name}</span>
                <select value={parentValue} onChange={(event) => setParentValue(event.target.value)} className={dependencyInputClass}>
                    <option value="">{'בחרו ' + parentField.name}</option>
                    {(parentField.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            </label>
            <span className="hidden h-7 items-center justify-center text-[13px] font-black text-[var(--color-primary)] md:flex">←</span>
            <label className="min-w-0">
                <span className="mb-0.5 block text-[10px] font-black text-[var(--color-text-secondary)]">{field.name}</span>
                <select disabled={!parentValue || !options.length} className={dependencyInputClass}>
                    <option>{!parentValue ? 'בחרו קודם ' + parentField.name : options.length ? 'בחרו ' + field.name : 'לא שויכו אפשרויות'}</option>
                    {options.map((option) => <option key={option}>{option}</option>)}
                </select>
            </label>
        </div>
    );
};

const DependencyEditor = ({ field, fields, onChange, compact = false }) => {
    const candidates = fields.filter((item) => item.id !== field.id && isValidParent(item) && !createsCycle(fields, field.id, item.id));
    const parentField = fields.find((item) => item.id === field.parentId);
    const parentOptions = parentField?.options || [];
    const childOptions = field.options || [];
    const [activeParentOption, setActiveParentOption] = useState(parentOptions[0] || '');
    const [pendingOption, setPendingOption] = useState('');
    useEffect(() => { if (!parentOptions.includes(activeParentOption)) setActiveParentOption(parentOptions[0] || ''); }, [activeParentOption, parentOptions.join('|')]);
    const setParent = (parentId) => {
        if (!parentId) return onChange({ ...field, parentId: undefined, dependencyMap: {} });
        if (createsCycle(fields, field.id, parentId)) return;
        onChange({ ...field, parentId, dependencyMap: {} });
    };
    const toggleMapping = (parentOption, childOption) => {
        if (!parentOption) return;
        const current = field.dependencyMap?.[parentOption] || [];
        const values = current.includes(childOption) ? current.filter((item) => item !== childOption) : [...current, childOption];
        onChange({ ...field, dependencyMap: { ...(field.dependencyMap || {}), [parentOption]: values } });
    };
    if (!selectorTypes.has(field.type)) return <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-1.5 text-center text-[11px] font-bold text-[var(--color-text-muted)]">תלות בין שדות זמינה לשדות בחירה בלבד.</div>;
    const selectedValues = field.dependencyMap?.[activeParentOption] || [];
    const mappedParentCount = parentOptions.filter((option) => (field.dependencyMap?.[option] || []).length > 0).length;
    const availableValues = childOptions.filter((option) => !selectedValues.includes(option));
    const addPendingOption = (option) => {
        if (!option || !activeParentOption) return;
        toggleMapping(activeParentOption, option);
        setPendingOption('');
    };
    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[12px] font-black text-[var(--color-text-primary)]">אפשרויות תלויות</h3>
                    {parentField && <button type="button" onClick={() => onChange({ ...field, parentId: undefined, dependencyMap: {} })} className="text-[11px] font-bold text-red-500 transition hover:text-red-600">הסר קשר</button>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={field.parentId || ''} onChange={(event) => setParent(event.target.value)} className="h-8 min-w-[110px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-[11px] font-bold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]">
                        <option value="">ללא תלות</option>
                        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                    <span className="text-[13px] font-black text-[var(--color-primary)]">←</span>
                    <div className="flex h-8 min-w-[84px] items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 text-[11px] font-bold text-[var(--color-text-primary)]">
                        {field.name}
                    </div>
                </div>
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">בחירת {parentField?.name || 'שדה משפיע'} מסננת את אפשרויות {field.name}, אך אינה בוחרת תשובה אוטומטית.</p>
                {parentField && <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{mappedParentCount} מתוך {childOptions.length} תשובות הוגדרו</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-sm">
                        <div className="flex h-[176px] min-h-[176px]">
                            <div className="w-[34%] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                                <div className="h-full overflow-y-auto p-1">
                                    {parentOptions.map((parentOption) => {
                                        const count = (field.dependencyMap?.[parentOption] || []).length;
                                        return <button key={parentOption} type="button" onClick={() => setActiveParentOption(parentOption)} className={cn('flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-[11px] font-bold transition', activeParentOption === parentOption ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]')}><span className="truncate">{parentOption}</span><span className="text-[10px] font-black opacity-75">{count}</span></button>;
                                    })}
                                </div>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col p-3 overflow-y-auto">
                                <h4 className="mb-2 text-center text-[12px] font-black leading-5 text-[var(--color-text-primary)]">אילו אפשרויות יוצגו כאשר נבחרה "{activeParentOption}"?</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedValues.map((option) => <span key={option} className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 text-[10px] font-bold text-[var(--color-primary)]"><span className="truncate">{option}</span><button type="button" onClick={() => toggleMapping(activeParentOption, option)} className="transition hover:text-red-500" aria-label={`הסר ${option}`}><Icon name="close" className="h-3 w-3" /></button></span>)}
                                    {!selectedValues.length && <span className="text-[11px] font-semibold italic text-[var(--color-text-muted)]">לא נבחרו אפשרויות.</span>}
                                </div>
                                <div className="mt-auto pt-2">
                                    <select value={pendingOption} onChange={(event) => addPendingOption(event.target.value)} className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-[11px] font-semibold text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]">
                                        <option value="">בחירת אפשרויות שיוצגו...</option>
                                        {availableValues.map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* <div className="space-y-1">
                        <div className="text-[10px] font-black text-[var(--color-text-muted)]">תצוגה מקדימה</div>
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
                            <DependencyPreview field={field} parentField={parentField} />
                        </div>
                    </div> */}
                </div>}
            </div>
        );
    }
    return (
        <div className="space-y-1.5">
            <div className="grid items-end gap-1.5 lg:grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_auto]">
                <label className="min-w-0">
                    <span className="mb-0.5 block text-[10px] font-black text-[var(--color-text-secondary)]">שדה משפיע</span>
                    <select value={field.parentId || ''} onChange={(event) => setParent(event.target.value)} className={dependencyInputClass}>
                        <option value="">ללא תלות</option>
                        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                </label>
                <span className="hidden h-7 items-center justify-center text-[13px] font-black text-[var(--color-primary)] lg:flex">←</span>
                <label className="min-w-0">
                    <span className="mb-0.5 block text-[10px] font-black text-[var(--color-text-secondary)]">שדה נוכחי</span>
                    <div className="inquiry-input-surface flex h-7 items-center rounded-lg px-2 text-[11px] font-black text-[var(--color-text-primary)]">{field.name}</div>
                </label>
                {parentField && (
                    <button type="button" onClick={() => onChange({ ...field, parentId: undefined, dependencyMap: {} })} className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-red-300 bg-red-500/10 px-2 text-[10px] font-black text-red-500 transition hover:bg-red-500/15 dark:border-red-400/30 dark:text-red-300">
                        <Icon name="close" className="h-3 w-3" />הסר תלות
                    </button>
                )}
            </div>
            {!candidates.length && !parentField && <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">אין כרגע שדה בחירה פעיל שיכול לשמש כשדה משפיע.</div>}
            {parentField && (
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--color-border)] px-2 py-1">
                        <div className="min-w-0">
                            <div className="text-[12px] font-black text-[var(--color-text-primary)]">אפשרויות תלויות</div>
                            <div className="truncate text-[10px] font-semibold text-[var(--color-text-muted)]">בחירת ערך בשדה המשפיע מסננת את השדה הנוכחי.</div>
                        </div>
                        <span className="rounded-md bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-black text-[var(--color-primary)]">{mappedParentCount} מתוך {parentOptions.length}</span>
                    </div>
                    <div className="grid min-h-0 md:grid-cols-[112px_minmax(0,1fr)]">
                        <div className="max-h-[96px] overflow-y-auto border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 md:border-b-0 md:border-l">
                            {parentOptions.map((parentOption) => {
                                const count = (field.dependencyMap?.[parentOption] || []).length;
                                return (
                                    <button key={parentOption} type="button" onClick={() => setActiveParentOption(parentOption)} className={cn('flex h-7 w-full items-center justify-between gap-1 rounded-md px-1.5 text-right text-[10px] font-black transition', activeParentOption === parentOption ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]')}>
                                        <span className="truncate">{parentOption}</span>
                                        <span className="rounded bg-[var(--color-surface-raised)] px-1 py-0.5 text-[9px] text-[var(--color-text-muted)]">{count}</span>
                                    </button>
                                );
                            })}
                            {!parentOptions.length && <div className="px-2 py-2 text-center text-[11px] font-bold text-[var(--color-text-muted)]">אין אפשרויות בשדה המשפיע.</div>}
                        </div>
                        <div className="min-w-0 p-1.5">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
                                <div className="truncate text-[11px] font-black text-[var(--color-text-primary)]">מה יוצג כאשר נבחרה "{activeParentOption || parentField.name}"?</div>
                                <span className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[9px] font-black text-[var(--color-text-muted)]">{selectedValues.length} משויכות</span>
                            </div>
                            <div className="grid max-h-[78px] gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-4">
                                {childOptions.map((option) => {
                                    const checked = selectedValues.includes(option);
                                    return (
                                        <label key={option} className={cn('flex h-6 cursor-pointer items-center justify-between gap-1 rounded-md border px-1.5 text-[10px] font-bold transition', checked ? 'border-blue-600 bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]')}>
                                            <span className="truncate">{option}</span>
                                            <input type="checkbox" checked={checked} disabled={!activeParentOption} onChange={() => toggleMapping(activeParentOption, option)} className="h-3 w-3 shrink-0 accent-blue-600" />
                                        </label>
                                    );
                                })}
                                {!childOptions.length && <div className="col-span-full rounded-lg border border-dashed border-[var(--color-border-strong)] p-1.5 text-center text-[11px] font-bold text-[var(--color-text-muted)]">יש להוסיף אפשרויות לשדה הנוכחי לפני שיוך תלות.</div>}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-[var(--color-border)] px-2 py-1.5">
                        <div className="mb-1 text-[10px] font-black text-[var(--color-text-muted)]">תצוגה מקדימה</div>
                        <DependencyPreview field={field} parentField={parentField} />
                    </div>
                </div>
            )}
        </div>
    );
};
const LinkSettings = ({ field, onChange }) => {
    const linkConfig = field.linkConfig || {};
    const url = linkConfig.url || '';
    const external = linkConfig.targetType !== 'internal';
    const invalid = url && external && !/^https?:\/\//i.test(url);
    const internalInvalid = url && !external && !url.startsWith('/');
    const update = (patch) => onChange({ ...field, linkConfig: { ...linkConfig, ...patch } });
    return <div className="space-y-3"><div className="grid gap-1.5 md:grid-cols-2"><FieldLabel label="תווית הקישור"><input value={linkConfig.label || ''} onChange={(event) => update({ label: event.target.value })} className={inputClass} placeholder="לדוגמה: פתיחת מערכת" /></FieldLabel><FieldLabel label="כתובת היעד"><input value={url} onChange={(event) => update({ url: event.target.value })} className={cn(inputClass, (invalid || internalInvalid) && 'border-red-400')} placeholder={external ? 'https://example.com' : '/tickets/open'} /></FieldLabel><FieldLabel label="סוג היעד"><select value={linkConfig.targetType || 'external'} onChange={(event) => update({ targetType: event.target.value })} className={inputClass}><option value="internal">קישור פנימי</option><option value="external">קישור חיצוני</option></select></FieldLabel><FieldLabel label="אופן התצוגה"><select value={linkConfig.displayStyle || 'button'} onChange={(event) => update({ displayStyle: event.target.value })} className={inputClass}><option value="text">טקסט</option><option value="button">כפתור</option><option value="iconText">סמל וטקסט</option></select></FieldLabel></div><FieldLabel label="תיאור או טקסט מנחה"><textarea value={linkConfig.description || ''} onChange={(event) => update({ description: event.target.value })} className={textareaClass} placeholder="הסבר קצר על יעד הקישור" /></FieldLabel><ToggleSwitch checked={linkConfig.openInNewTab !== false} onChange={(value) => update({ openInNewTab: value })} label="פתיחה בלשונית חדשה" description="לקישורים חיצוניים יופעל מנגנון פתיחה בטוח עם noopener noreferrer." />{(invalid || internalInvalid) && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">יש להזין כתובת קישור תקינה.</div>}</div>;
};

const FieldEditor = ({ field, fields, settings, setSettings, onChange, onDelete, onAddOption, onRenameOption, onDeleteOption, onMoveOption }) => {
    if (!field) return <EmptyState title="בחרו שדה לעריכה" text="בחרו שדה מהרשימה כדי לערוך את ההגדרות שלו, או צרו שדה חדש מסוג השדה המתאים." />;
    const canChangeType = !field.locked && !isCanonicalIncidentDescriptionField(field);
    const usesCompactSelectEditor = selectorTypes.has(field.type);
    const changeType = (type) => {
        const template = typeById[type] || typeById.text;
        onChange({ ...field, type, typeLabel: template.typeLabel || template.name, options: selectorTypes.has(type) ? (field.options?.length ? field.options : ['אפשרות 1', 'אפשרות 2']) : [], parentId: selectorTypes.has(type) ? field.parentId : undefined, dependencyMap: selectorTypes.has(type) ? field.dependencyMap || {} : {}, linkConfig: type === 'link' ? { label: field.name, url: field.linkConfig?.url || '', targetType: 'external', displayStyle: 'button', openInNewTab: true } : {} });
    };
    return <SectionShell title={field.isNew ? 'הגדרת שדה חדש' : `עריכת שדה: ${field.name}`} meta={usesCompactSelectEditor ? null : getTypeLabel(field)} className="h-full max-h-[560px]" actions={usesCompactSelectEditor ? <CompactCheckbox checked={Boolean(field.required)} disabled={field.locked && field.required} onChange={(value) => onChange({ ...field, required: value })} label="שדה חובה" /> : undefined}><div className={cn('min-h-0 flex-1', usesCompactSelectEditor ? 'space-y-2.5 p-3' : 'space-y-2 p-2')}>{usesCompactSelectEditor ? <section className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"><div className="grid gap-2 md:grid-cols-2"><div><label className="mb-1 block text-[11px] font-bold text-[var(--color-text-secondary)]">שם השדה</label><input value={field.name || ''} onChange={(event) => onChange({ ...field, name: event.target.value })} className={cn(inputClass, 'h-9 rounded-lg px-2.5 text-[12px]')} /></div><div><label className="mb-1 block text-[11px] font-bold text-[var(--color-text-secondary)]">טקסט מנחה</label><input value={field.placeholder || ''} onChange={(event) => onChange({ ...field, placeholder: event.target.value })} className={cn(inputClass, 'h-9 rounded-lg px-2.5 text-[12px]')} /></div></div><div className="border-t border-[var(--color-border)] pt-2"><OptionEditor field={field} onAdd={onAddOption} onRename={onRenameOption} onDelete={onDeleteOption} onMove={onMoveOption} compact /></div><div className="border-t border-[var(--color-border)] pt-2"><DependencyEditor field={field} fields={fields} onChange={onChange} compact /></div></section> : <EditorSection title="מידע בסיסי" description="השם, ההנחיה וההתנהגות הבסיסית של השדה בטופס."><div className="grid gap-1.5 md:grid-cols-2"><FieldLabel label="שם השדה" help="השם שיוצג למשתמשים בטופס."><input value={field.name || ''} onChange={(event) => onChange({ ...field, name: event.target.value })} className={inputClass} /></FieldLabel><FieldLabel label="טקסט מנחה" help="הסבר קצר שמסייע למשתמש למלא את השדה."><input value={field.placeholder || ''} onChange={(event) => onChange({ ...field, placeholder: event.target.value })} className={inputClass} /></FieldLabel>
        {/* <FieldLabel label="סוג השדה"><select value={field.type} onChange={(event) => changeType(event.target.value)} disabled={!canChangeType} className={inputClass}>{fieldTemplates.map((template) => <option key={template.type} value={template.type}>{template.name}</option>)}{field.type === 'phone' && <option value="phone">טלפון</option>}{field.type === 'user' && <option value="user">משתמש</option>}</select></FieldLabel> */}
        {/* <FieldLabel label="קבוצת שדות"><select value={field.group || 'room'} onChange={(event) => onChange({ ...field, group: event.target.value })} className={inputClass}><option value="system">שדות מערכת</option><option value="room">שדות חדר</option></select></FieldLabel> */}
    </div><div className="mt-2 grid gap-2 md:grid-cols-2"><ToggleSwitch checked={Boolean(field.required)} disabled={field.locked && field.required} onChange={(value) => onChange({ ...field, required: value })} label="שדה חובה" description="לא ניתן לפרסם את הפנייה ללא מילוי השדה." /><ToggleSwitch checked={fieldVisible(field)} onChange={(value) => onChange({ ...field, active: value, visible: value, showInNewInquiry: value })} label="שדה פעיל" description="שדה כבוי לא יוצג בטופס הפנייה החדשה." /></div></EditorSection>}{selectorTypes.has(field.type) && !usesCompactSelectEditor && <EditorSection title="אפשרויות בחירה" description="הוספה, עריכה, מחיקה וסידור של אפשרויות הבחירה."><OptionEditor field={field} onAdd={onAddOption} onRename={onRenameOption} onDelete={onDeleteOption} onMove={onMoveOption} /></EditorSection>}{selectorTypes.has(field.type) && !usesCompactSelectEditor && <EditorSection title="תלות בין שדות" description="סינון אפשרויות לפי בחירה בשדה משפיע, למשל עיר -> שכונה."><DependencyEditor field={field} fields={fields} onChange={onChange} /></EditorSection>}
        {/* <EditorSection title="תצוגה ומיקום" description="קביעה היכן השדה יוצג ואיך יתפוס מקום בפריסות השונות."><div className="grid gap-1.5 md:grid-cols-2"><ToggleSwitch checked={field.showInNewInquiry !== false} onChange={(value) => onChange({ ...field, showInNewInquiry: value })} label="הצגה בטופס פנייה חדשה" />
            <ToggleSwitch checked={field.showInRow !== false} onChange={(value) => onChange({ ...field, showInRow: value })} label="הצגה בשורת פנייה" /><ToggleSwitch checked={field.showInDetails !== false} onChange={(value) => onChange({ ...field, showInDetails: value })} label="הצגה בפרטי פנייה" /><FieldLabel label="רוחב שדה"><select value={field.width || 'חצי רוחב'} onChange={(event) => onChange({ ...field, width: event.target.value })} disabled={isCanonicalIncidentDescriptionField(field)} className={inputClass}>{widthOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FieldLabel></div>{isCanonicalIncidentDescriptionField(field) && <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-bold text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/10 dark:text-blue-200">שדה תיאור התקלה הקנוני מוצג אוטומטית ברוחב מלא. שדות טקסט חופשי אחרים נשארים רגילים אלא אם הוגדר אחרת.</div>}</EditorSection> */}
        {/* <EditorSection title="הרשאות וטווח" description="ניהול ירושה מהמערכת, מהסביבה או מהחדר."><ScopeControls settings={settings} setSettings={setSettings} compact /><div className="mt-2 grid gap-2 md:grid-cols-2"><FieldLabel label="טווח השדה"><select value={field.scope || 'system'} onChange={(event) => onChange({ ...field, scope: event.target.value })} className={inputClass}><option value="system">מערכת</option><option value="environment">סביבה</option><option value="subEnvironment">תת-סביבה</option><option value="room">חדר</option></select></FieldLabel><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-[12px] font-semibold leading-5 text-[var(--color-text-muted)]">שינוי מקומי אינו משנה את הגדרת האב. איפוס הורשה מחזיר את החדר להתנהגות האב.</div></div></EditorSection> */}
        {field.type === 'link' && <EditorSection title="הגדרות קישור" description="יעד, סגנון תצוגה והתנהגות פתיחה של קישור פנימי או חיצוני."><LinkSettings field={field} onChange={onChange} /></EditorSection>}<div className="flex flex-wrap justify-between gap-2 items-center  "><ToolbarButton icon="trash" tone="danger" disabled={field.locked} title={field.locked ? 'שדה מערכת מוגן ואינו ניתן למחיקה' : 'מחיקת שדה'} onClick={() => onDelete(field)}>מחיקת שדה</ToolbarButton><span className="text-[11px] font-bold text-[var(--color-text-muted)]">השינויים נשמרים אוטומטית.</span></div></div></SectionShell>;
};
const GeneralSettings = ({ settings, setSettings }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState(settings.incidentDescriptionTemplates?.[0]?.id || '');
    const templates = settings.incidentDescriptionTemplates || [];
    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;
    const pageSizes = [5, 7, 10, 15, 25];

    useEffect(() => {
        if (templates.length && !templates.some((template) => template.id === selectedTemplateId)) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [selectedTemplateId, templates]);

    const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
    const updateTemplates = (updater) => setSettings((current) => ({ ...current, incidentDescriptionTemplates: typeof updater === 'function' ? updater(current.incidentDescriptionTemplates || []) : updater }));
    const createTemplate = () => {
        const template = { id: createRuntimeId('incident-template'), title: 'תבנית חדשה', enabled: true, content: 'תיאור תקלה חדשה. ניתן לערוך בהמשך.' };
        updateTemplates((current) => [...current, template]);
        setSelectedTemplateId(template.id);
    };
    const patchTemplate = (id, patch) => updateTemplates((current) => current.map((template) => template.id === id ? { ...template, ...patch } : template));
    const deleteTemplate = () => {
        if (!selectedTemplate || !window.confirm('למחוק את התבנית?')) return;
        updateTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id));
    };
    const moveTemplate = (id, delta) => updateTemplates((current) => {
        const next = [...current];
        const index = next.findIndex((template) => template.id === id);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= next.length) return current;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
    });

    return (
        <div className="space-y-4">
            <SectionShell title="התנהגות פניות" meta="הגדרות כלליות של החדר." className="overflow-visible">
                <div className="space-y-4 p-4">
                    {/* <div className="grid gap-3 md:grid-cols-2">
                        <FieldLabel label="דחיפות ברירת מחדל">
                            <select value={settings.defaultPriority || 'נמוכה-3'} onChange={(event) => update('defaultPriority', event.target.value)} className={inputClass}>
                                <option>גבוהה-1</option>
                                <option>בינונית-2</option>
                                <option>נמוכה-3</option>
                            </select>
                        </FieldLabel>
                        <FieldLabel label="פורמט מספר פנייה">
                            <input value={settings.numberFormat || ''} onChange={(event) => update('numberFormat', event.target.value)} className={inputClass} />
                        </FieldLabel>
                    </div> */}
                    <ToggleSwitch checked={Boolean(settings.automaticAssignmentEnabled)} onChange={(value) => update('automaticAssignmentEnabled', value)} label="שיוך אישי אוטומטי" description="כאשר פעיל, המערכת תשייך את הפנייה לגורם זמין בחדר." />
                    <ToggleSwitch checked={settings.userAssignmentEnabled !== false} onChange={(value) => update('userAssignmentEnabled', value)} label="הפעלת שיוך משתמשים" description="כאשר פעיל, השיוך האישי מחליף את השיוך האוטומטי." />
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <FieldLabel label="צליל סגירה">
                            <select value={settings.closeSound || 'off'} onChange={(event) => update('closeSound', event.target.value)} className={inputClass}>
                                {closeSoundOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </FieldLabel>
                        <ToolbarButton icon="volume" disabled={(settings.closeSound || 'off') === 'off'} onClick={() => notificationSoundService.play(settings.closeSound)}>השמע צליל התראה</ToolbarButton>
                    </div>
                    <div>
                        <div className="mb-2 text-[12px] font-black text-[var(--color-text-secondary)]">כמות פניות בעמוד</div>
                        <div className="flex flex-wrap gap-2">{pageSizes.map((size) => <button key={size} type="button" onClick={() => update('inquiriesPerPage', size)} className={cn('h-9 min-w-12 rounded-xl border px-3 text-[12px] font-black transition', Number(settings.inquiriesPerPage) === size ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]')}>{size}</button>)}</div>
                    </div>
                </div>
            </SectionShell>

            <SectionShell title="תבניות תיאור תקלה" meta="מקור התבניות הקבוע של טופס פנייה חדשה." className="overflow-visible">
                <div className="grid gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-[13px] font-black text-[var(--color-text-primary)]">תבניות</div>
                            <ToolbarButton icon="plus" tone="primary" onClick={createTemplate}>תבנית חדשה</ToolbarButton>
                        </div>
                        <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                            {templates.map((template) => (
                                <button key={template.id} type="button" onClick={() => setSelectedTemplateId(template.id)} className={cn('grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2 text-right transition', selectedTemplate?.id === template.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-transparent bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]')}>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[12px] font-black text-[var(--color-text-primary)]">{summarizeIncidentTemplate(template.content, template.title)}</span>
                                        <span className="mt-1 block truncate text-[11px] font-semibold text-[var(--color-text-muted)]">{template.enabled === false ? 'כבויה' : 'פעילה'} ? {template.content}</span>
                                    </span>
                                    <span className="flex gap-1">
                                        <span onClick={(event) => { event.stopPropagation(); moveTemplate(template.id, -1); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"><Icon name="arrowUpStraight" className="h-3.5 w-3.5" /></span>
                                        <span onClick={(event) => { event.stopPropagation(); moveTemplate(template.id, 1); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"><Icon name="arrowDownStraight" className="h-3.5 w-3.5" /></span>
                                    </span>
                                </button>
                            ))}
                            {!templates.length && <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-5 text-center text-[12px] font-bold text-[var(--color-text-muted)]">לא הוגדרו תבניות עדיין.</div>}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                        {selectedTemplate ? (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">עריכת תבנית</h3>
                                    <ToolbarButton icon="trash" tone="danger" onClick={deleteTemplate}>מחק</ToolbarButton>
                                </div>
                                <FieldLabel label="שם התבנית">
                                    <input value={selectedTemplate.title || ''} onChange={(event) => patchTemplate(selectedTemplate.id, { title: event.target.value })} className={inputClass} />
                                </FieldLabel>
                                <FieldLabel label="תוכן התבנית">
                                    <textarea value={selectedTemplate.content || ''} onChange={(event) => patchTemplate(selectedTemplate.id, { content: event.target.value })} className="inquiry-input-surface min-h-[190px] w-full resize-y rounded-2xl px-3 py-3 text-right text-[13px] font-semibold leading-6 outline-none focus:border-[var(--color-primary)]" />
                                </FieldLabel>
                                <ToggleSwitch checked={selectedTemplate.enabled !== false} onChange={(value) => patchTemplate(selectedTemplate.id, { enabled: value })} label="תבנית פעילה" description="רק תבניות פעילות יופיעו בבורר התבניות בפנייה חדשה." />
                                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                                    <div className="mb-1 text-[11px] font-black text-[var(--color-text-muted)]">תצוגה מקדימה</div>
                                    <p className="whitespace-pre-wrap text-[12px] font-semibold leading-6 text-[var(--color-text-primary)]">{selectedTemplate.content}</p>
                                </div>
                            </div>
                        ) : <EmptyState title="לא נבחרה תבנית" text="בחרו תבנית כדי לערוך את תוכנה." />}
                    </div>
                </div>
            </SectionShell>
        </div>
    );
};
const SettingsPage = () => {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const [activeTab, setActiveTab] = useState('fields');
    const { settings, setSettings, loaded, loadError, reload, saveStatus } = useRoomSettings({ autosave: true, debounceMs: 450 });
    const fields = settings.fields?.length ? settings.fields : defaultInquiryFields;
    const tableFields = settings.tableFields?.length ? settings.tableFields : fields.slice(0, 6).map((field) => field.id);
    const sections = settings.sections?.length ? settings.sections : createDefaultSections(fields);
    const [selectedFieldId, setSelectedFieldId] = useState('');
    const [fieldSearch, setFieldSearch] = useState('');
    const createLockRef = useRef(false);
    const fieldById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
    const selectedField = fieldById.get(selectedFieldId) || fields.find((field) => field.id === 'neighborhood') || fields[0] || null;
    useEffect(() => { if (!loaded || selectedFieldId || !fields.length) return; setSelectedFieldId((fields.find((field) => field.id === 'neighborhood') || fields[0]).id); }, [fields, loaded, selectedFieldId]);
    useEffect(() => { if (selectedFieldId && !fieldById.has(selectedFieldId)) setSelectedFieldId(fields[0]?.id || ''); }, [fieldById, fields, selectedFieldId]);
    const updateSettingsPart = (key, updater) => setSettings((current) => ({ ...current, [key]: typeof updater === 'function' ? updater(current[key] || []) : updater }));
    const setTableFields = (updater) => updateSettingsPart('tableFields', updater);
    const setSections = (updater) => updateSettingsPart('sections', updater);
    const setGeneralSettings = (updater) => setSettings((current) => ({ ...current, general: typeof updater === 'function' ? updater(current.general || {}) : updater }));
    const updateFields = (updater) => setSettings((current) => { const currentFields = current.fields?.length ? current.fields : fields; const nextFields = typeof updater === 'function' ? updater(currentFields) : updater; return { ...current, fields: nextFields }; });
    const updateField = (field) => { const nextField = cloneSettingsField(field); delete nextField.isNew; setSelectedFieldId(nextField.id); setSettings((current) => { const currentFields = current.fields?.length ? current.fields : fields; const nextFields = currentFields.map((item) => item.id === nextField.id ? nextField : item); const next = { ...current, fields: nextFields }; if (isCanonicalIncidentDescriptionField(nextField)) next.general = { ...(current.general || {}), incidentDescription: { ...(current.general?.incidentDescription || {}), label: nextField.name, placeholder: nextField.placeholder, helpText: nextField.helpText || current.general?.incidentDescription?.helpText || '', required: nextField.required } }; return next; }); };
    const createField = (template) => { if (createLockRef.current) return; createLockRef.current = true; window.setTimeout(() => { createLockRef.current = false; }, 350); const id = makeFieldId(template.type); const newField = { id, name: 'שדה חדש', type: template.type, typeLabel: template.typeLabel || template.name, group: 'room', required: false, locked: false, active: true, visible: true, showInNewInquiry: true, showInRow: template.type !== 'longtext', showInDetails: true, width: 'חצי רוחב', scope: 'room', placeholder: template.example, helpText: '', options: selectorTypes.has(template.type) ? ['אפשרות 1', 'אפשרות 2'] : [], dependencyMap: {}, linkConfig: template.type === 'link' ? { label: 'פתיחת קישור', url: '', targetType: 'external', displayStyle: 'button', openInNewTab: true } : {} }; setSettings((current) => { const currentFields = current.fields?.length ? current.fields : fields; const currentSections = current.sections?.length ? current.sections : createDefaultSections(currentFields); const nextSections = currentSections.map((section, index) => index === currentSections.length - 1 ? { ...section, fields: [...section.fields, { id, visible: true, width: newField.width }] } : section); return { ...current, fields: [...currentFields, newField], sections: nextSections }; }); setSelectedFieldId(id); };
    const duplicateField = (field) => { const copy = { ...cloneSettingsField(field), id: makeFieldId(field.type), name: `${field.name} - עותק`, locked: false, key: undefined, role: undefined }; setSettings((current) => { const currentFields = current.fields?.length ? current.fields : fields; const index = currentFields.findIndex((item) => item.id === field.id); const nextFields = [...currentFields]; nextFields.splice(index + 1, 0, copy); return { ...current, fields: nextFields, sections: (current.sections || sections).map((section) => ({ ...section, fields: section.fields.some((item) => item.id === field.id) ? [...section.fields, { id: copy.id, visible: true, width: copy.width || 'חצי רוחב' }] : section })) }; }); setSelectedFieldId(copy.id); };
    const toggleActive = (field) => updateField({ ...field, active: !fieldVisible(field), visible: !fieldVisible(field), showInNewInquiry: !fieldVisible(field) });
    const deleteField = (field) => { if (!field || field.locked) return; if (!window.confirm('למחוק את השדה? ההגדרה תישמר אוטומטית.')) return; const deletedId = field.id; setSettings((current) => ({ ...current, fields: (current.fields || []).filter((item) => item.id !== deletedId).map((item) => item.parentId === deletedId ? { ...item, parentId: undefined, dependencyMap: {} } : item), tableFields: (current.tableFields || []).filter((id) => id !== deletedId), sections: (current.sections || []).map((section) => ({ ...section, fields: section.fields.filter((item) => item.id !== deletedId) })) })); setSelectedFieldId(fields.find((item) => item.id !== deletedId)?.id || ''); };
    const reorderField = (draggedId, targetId) => { if (!draggedId || draggedId === targetId) return; updateFields((currentFields) => { const next = [...currentFields]; const from = next.findIndex((field) => field.id === draggedId); const to = next.findIndex((field) => field.id === targetId); if (from < 0 || to < 0) return currentFields; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); };
    const moveField = (fieldId, delta) => updateFields((currentFields) => { const next = [...currentFields]; const index = next.findIndex((field) => field.id === fieldId); const target = index + delta; if (index < 0 || target < 0 || target >= next.length) return currentFields;[next[index], next[target]] = [next[target], next[index]]; return next; });
    const addOption = (fieldId, value) => updateFields((currentFields) => currentFields.map((field) => field.id === fieldId ? { ...field, options: unique([...(field.options || []), value]) } : field));
    const renameOption = (fieldId, oldValue, newValueRaw) => { const newValue = newValueRaw.trim(); if (!newValue || newValue === oldValue) return; updateFields((currentFields) => currentFields.map((field) => { if (field.id === fieldId) return { ...field, options: unique((field.options || []).map((option) => option === oldValue ? newValue : option)), dependencyMap: Object.fromEntries(Object.entries(field.dependencyMap || {}).map(([parentOption, values]) => [parentOption, values.map((value) => value === oldValue ? newValue : value)])) }; if (field.parentId === fieldId) { const map = { ...(field.dependencyMap || {}) }; if (map[oldValue]) { map[newValue] = map[oldValue]; delete map[oldValue]; } return { ...field, dependencyMap: map }; } return field; })); };
    const deleteOption = (fieldId, value) => updateFields((currentFields) => currentFields.map((field) => { if (field.id === fieldId) return { ...field, options: (field.options || []).filter((option) => option !== value), dependencyMap: Object.fromEntries(Object.entries(field.dependencyMap || {}).map(([parentOption, values]) => [parentOption, values.filter((item) => item !== value)])) }; if (field.parentId === fieldId) { const map = { ...(field.dependencyMap || {}) }; delete map[value]; return { ...field, dependencyMap: map }; } return field; }));
    const moveOption = (fieldId, index, delta) => updateFields((currentFields) => currentFields.map((field) => { if (field.id !== fieldId) return field; const options = [...(field.options || [])]; const target = index + delta; if (target < 0 || target >= options.length) return field;[options[index], options[target]] = [options[target], options[index]]; return { ...field, options }; }));
    const saveLabel = !loaded ? 'טוען...' : saveStatus === 'saving' ? 'שומר...' : saveStatus === 'error' ? 'השמירה נכשלה' : 'שינוי נשמר';
    const saveClass = saveStatus === 'error' ? 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-300' : saveStatus === 'saving' ? 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-200' : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300';
    if (loadError) return <div className="inquiry-page-surface flex h-full min-h-0 flex-col overflow-hidden p-3" dir="rtl"><PageErrorState onRetry={reload} /></div>;
    if (!loaded) return <div className="inquiry-page-surface flex h-full min-h-0 flex-col overflow-hidden p-3" dir="rtl"><PageLoadingState /></div>;
    return <div className="inquiry-page-surface flex h-full min-h-0 flex-col overflow-hidden p-3" dir="rtl"><header className="mb-3 shrink-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[24px] font-black tracking-tight text-[var(--color-text-primary)]">הגדרות מערכת - {selectedRoom?.name || ''}</h1><p className="mt-1 text-[13px] font-semibold text-[var(--color-text-secondary)]">בעמוד זה ניתן לערוך את השדות, התצוגה וההתנהגות של החדר.</p></div><span className={cn('rounded-full px-3 py-1 text-[12px] font-black', saveClass)}>{saveLabel}</span></div><nav className="mt-4 flex flex-wrap items-center gap-5 border-b border-[var(--color-border-strong)]">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn('relative pb-2.5 text-[13px] font-black transition focus:outline-none  focus:ring-blue-400/25', activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')}>{tab.label}{activeTab === tab.id && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-[var(--color-primary)]" />}</button>)}</nav></header><main className={`min-h-0 flex-1 ${activeTab === 'fields' ? 'overflow-y-hidden' : 'overflow-auto'}`}>{activeTab === 'fields' && <div dir="ltr" className="mx-auto grid max-w-[1460px] gap-3 overflow-hidden xl:grid-cols-[minmax(250px,0.82fr)_minmax(480px,1.85fr)_minmax(220px,0.68fr)]"><div dir="rtl" className="min-h-0"><ActiveFieldsPanel fields={fields} selectedId={selectedField?.id} query={fieldSearch} setQuery={setFieldSearch} onSelect={(field) => setSelectedFieldId(field.id)} onReorder={reorderField} onMove={moveField} onDuplicate={duplicateField} onToggleActive={toggleActive} onDelete={deleteField} /></div><div dir="rtl" className="min-h-0"><FieldEditor field={selectedField} fields={fields} settings={settings} setSettings={setSettings} onChange={updateField} onDelete={deleteField} onAddOption={addOption} onRenameOption={renameOption} onDeleteOption={deleteOption} onMoveOption={moveOption} /></div><div dir="rtl" className="min-h-0"><TemplatePanel onCreate={createField} /></div></div>}{activeTab === 'display' && <InquiryLayoutBuilder settings={settings} setSettings={setSettings} fields={fields} tableFields={tableFields} sections={sections} saveStatus={saveStatus} />}{activeTab === 'general' && <GeneralSettings settings={settings.general || {}} setSettings={setGeneralSettings} />}</main></div>;
};

export default SettingsPage;

