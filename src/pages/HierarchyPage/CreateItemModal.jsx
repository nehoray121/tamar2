import React, { useEffect, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';

const initialState = { name: '', description: '' };

const FieldLabel = ({ label, required = false, children }) => (
    <label className="block text-right">
        <span className="mb-1.5 block text-[12px] font-black text-[var(--color-text-primary)]">
            {label}
            {required && <span className="mr-1 text-red-500">*</span>}
        </span>
        {children}
    </label>
);

export const CreateItemFormPanel = ({
    type,
    open = true,
    onCancel,
    onCreateSubEnvironment,
    onCreateRoom,
    onSuccess,
    currentSubEnvironment
}) => {
    const [form, setForm] = useState(initialState);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setForm(initialState);
        setSubmitting(false);
        setError('');
    }, [open, type]);

    const isSubEnvironment = type === 'sub_env';
    const submitLabel = isSubEnvironment ? 'יצירת תת-סביבה' : 'יצירת חדר';
    const setField = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setError('');
    };

    const submit = async () => {
        const name = form.name.trim();
        if (!name) {
            setError(isSubEnvironment ? 'יש להזין שם תת-סביבה.' : 'יש להזין שם חדר.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const input = {
                name,
                description: form.description.trim(),
                ...(isSubEnvironment ? {} : { subEnvironmentId: currentSubEnvironment?.id })
            };
            const created = isSubEnvironment
                ? await onCreateSubEnvironment(input)
                : await onCreateRoom(input);
            onSuccess?.(created);
        } catch (submitError) {
            setError(submitError?.message || 'שמירת הפריט נכשלה.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 px-1 py-1">
                <FieldLabel label={isSubEnvironment ? 'שם תת-סביבה' : 'שם חדר'} required>
                    <input
                        data-testid="organization-create-name"
                        value={form.name}
                        onChange={(event) => setField('name', event.target.value)}
                        placeholder={isSubEnvironment ? 'הזן שם תת-סביבה' : 'הזן שם חדר'}
                        className="inquiry-input-surface h-11 w-full rounded-xl px-3 text-[13px] font-bold outline-none focus:border-[var(--color-primary)]"
                        autoFocus
                    />
                </FieldLabel>

                <FieldLabel label="תיאור">
                    <textarea
                        data-testid="organization-create-description"
                        value={form.description}
                        onChange={(event) => setField('description', event.target.value)}
                        placeholder={isSubEnvironment ? 'הוסף תיאור קצר על תת-הסביבה' : 'הוסף תיאור קצר על החדר'}
                        className="inquiry-input-surface min-h-[104px] w-full resize-none rounded-xl px-3 py-3 text-[13px] font-semibold outline-none focus:border-[var(--color-primary)]"
                    />
                </FieldLabel>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2.5 text-[11px] font-bold leading-5 text-[var(--color-text-secondary)]">
                    הפריט ייווצר פעיל בהיררכיה הארגונית ויישמר בשרת לאחר אימות ההרשאה.
                </div>

                {error && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                    </div>
                )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-1 pt-4">
                <button type="button" onClick={onCancel} disabled={submitting} className="inquiry-control inline-flex h-11 items-center justify-center rounded-xl px-5 text-[13px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:opacity-60">
                    ביטול
                </button>
                <button data-testid="organization-create-submit" type="button" onClick={submit} disabled={submitting} className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? 'שומר...' : submitLabel}
                </button>
            </div>
        </div>
    );
};

const CreateItemModal = ({
    type,
    open,
    onClose,
    onCreateSubEnvironment,
    onCreateRoom,
    onSuccess
}) => {
    const isSubEnvironment = type === 'sub_env';
    const title = isSubEnvironment ? 'יצירת תת-סביבה חדשה' : 'יצירת חדר חדש';
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" dir="rtl" onMouseDown={onClose}>
            <div data-testid="organization-create-dialog" role="dialog" aria-modal="true" aria-labelledby="organization-create-title" className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] shadow-[0_24px_70px_rgba(15,23,42,0.32)]" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                    <button type="button" onClick={onClose} className="inquiry-control flex h-10 w-10 items-center justify-center rounded-xl p-0 text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]" aria-label="סגירת חלון">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <h2 id="organization-create-title" className="text-[24px] font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
                    <CreateItemFormPanel
                        type={type}
                        open={open}
                        onCancel={onClose}
                        onCreateSubEnvironment={onCreateSubEnvironment}
                        onCreateRoom={onCreateRoom}
                        onSuccess={(created) => {
                            onSuccess?.(created);
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateItemModal;
