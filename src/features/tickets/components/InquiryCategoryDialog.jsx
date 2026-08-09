import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import CategoryColorPicker, { normalizeHexColor } from './CategoryColorPicker.jsx';

const colors = ['#F97316', '#06B6D4', '#EF4444', '#EC4899', '#22C55E', '#8B5CF6'];

const InquiryCategoryDialog = ({ open, mode, category, onClose, onSubmit, onDelete, loading = false }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(colors[0]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef(null);
    const openerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        openerRef.current = document.activeElement;
        setName(category?.name || '');
        setDescription(category?.description || '');
        setColor(normalizeHexColor(category?.color || colors[0]));
        setError('');
        setSubmitting(false);
        const focusFrame = requestAnimationFrame(() => nameInputRef.current?.focus());
        return () => {
            cancelAnimationFrame(focusFrame);
            openerRef.current?.focus?.();
        };
    }, [category, open]);

    const handleSubmit = async () => {
        const normalizedName = name.trim();
        if (!normalizedName) return setError('יש להזין שם קטגוריה.');
        if (normalizedName.length > 100) return setError('שם הקטגוריה יכול להכיל עד 100 תווים.');
        if (description.length > 500) return setError('התיאור יכול להכיל עד 500 תווים.');
        setSubmitting(true);
        setError('');
        try {
            await onSubmit({ name: normalizedName, description: description.trim() || null, color });
        } catch (nextError) {
            setError(nextError?.message || 'לא ניתן לשמור את הקטגוריה.');
            setSubmitting(false);
        }
    };

    const handleArchive = async () => {
        const confirmed = window.confirm('הקטגוריה תועבר לארכיון ולא תהיה זמינה לשיוך חדש. שיוכים קיימים יישארו מוצגים וניתנים להסרה. לא ניתן לשחזר פעולה זו.');
        if (!confirmed) return;
        setSubmitting(true);
        setError('');
        try {
            await onDelete(category.id);
        } catch (nextError) {
            setError(nextError?.message || 'לא ניתן להעביר את הקטגוריה לארכיון.');
            setSubmitting(false);
        }
    };

    if (!open) return null;
    const busy = loading || submitting;

    return (
        <div className="inquiry-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl" onMouseDown={() => !busy && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="inquiry-overlay-panel w-full max-w-sm rounded-2xl p-4" onMouseDown={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <button type="button" onClick={onClose} disabled={busy} className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text disabled:opacity-50">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <h3 id="category-dialog-title" className="text-base font-black inquiry-primary-text">{mode === 'edit' ? 'עריכת קטגוריה' : 'יצירת קטגוריה'}</h3>
                </div>

                <label className="mb-3 block text-sm font-black inquiry-primary-text">
                    שם קטגוריה
                    <input data-testid="board-category-name" ref={nameInputRef} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="inquiry-input-surface mt-1 h-10 w-full rounded-xl px-3 text-sm font-bold outline-none focus:border-blue-500" />
                </label>

                <label className="mb-3 block text-sm font-black inquiry-primary-text">
                    תיאור <span className="text-[11px] font-semibold inquiry-muted-text">(אופציונלי)</span>
                    <textarea maxLength={500} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className="inquiry-input-surface mt-1 w-full resize-none rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500" />
                </label>

                <div className="mb-4">
                    <div className="mb-2 text-sm font-black inquiry-primary-text">צבע</div>
                    <CategoryColorPicker color={color} shortcuts={colors} onColorPick={setColor} />
                </div>

                {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

                <div className="flex items-center justify-between gap-2">
                    {mode === 'edit' && !category?.system ? (
                        <button data-testid="board-category-archive" type="button" onClick={handleArchive} disabled={busy} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-50 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">העבר לארכיון</button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} disabled={busy} className="inquiry-control rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50">ביטול</button>
                        <button data-testid="board-category-submit" type="button" onClick={handleSubmit} disabled={busy || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'שומר...' : 'שמירה'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryCategoryDialog;