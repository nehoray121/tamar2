import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const CustomerHistoryDrawer = ({ open, onClose, inquiries }) => (
    <aside
        className={`absolute bottom-4 left-5 top-16 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-[390px]'}`}
        dir="rtl"
        aria-hidden={!open}
    >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-blue-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <Icon name="history" className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-black text-slate-950">פניות פתוחות של הלקוח</h2>
                    <p className="text-[11px] font-bold text-slate-500">מוצגות רק פניות שעדיין פתוחות</p>
                </div>
            </div>

            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-slate-500">
                <Icon name="close" className="h-4 w-4" />
            </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-3">
            {inquiries.map((inquiry) => (
                <article key={inquiry.id} className="rounded-2xl border border-blue-100 bg-white p-3 text-right shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">{inquiry.status}</span>
                        <span className="text-sm font-black text-slate-950">{inquiry.id}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[12px] font-bold text-slate-500">
                        <span className="rounded-full bg-red-50 px-2 py-1 text-red-500">{inquiry.priority}</span>
                        <span>{inquiry.description}</span>
                    </div>

                    <button type="button" className="mt-3 h-8 rounded-lg bg-blue-50 px-4 text-xs font-black text-blue-700">
                        צפה
                    </button>
                </article>
            ))}
        </div>
    </aside>
);

export default CustomerHistoryDrawer;
