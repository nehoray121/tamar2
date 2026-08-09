import React, { useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { closeInquiryService } from '../services/closeInquiryService.js';

const CloseInquiryDialog = ({ ticket, open, onClose, onClosed }) => {
    const [summary, setSummary] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const submit = async () => {
        if (!summary.trim()) {
            setError('נדרש למלא סיכום טיפול');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const closedTicket = await closeInquiryService.closeInquiry(ticket.id, { summary });
            onClosed?.(closedTicket);
            onClose();
        } catch (err) {
            setError(err.message || 'סגירת הפנייה נכשלה');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4" dir="rtl" onMouseDown={onClose}>
            <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 text-slate-400">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <h3 className="text-base font-black text-slate-950">סגירת פנייה {ticket?.id}</h3>
                </div>
                <label className="block text-sm font-black text-slate-800">
                    סיכום טיפול / פתרון
                    <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-2 h-28 w-full resize-none rounded-xl border border-blue-100 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500" placeholder="תארו מה בוצע ואיך נסגרה הפנייה" />
                </label>
                {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">ביטול</button>
                    <button type="button" onClick={submit} disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{submitting ? 'סוגר...' : 'סגור פנייה'}</button>
                </div>
            </div>
        </div>
    );
};

export default CloseInquiryDialog;
