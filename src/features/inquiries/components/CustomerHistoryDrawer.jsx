import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const CustomerHistoryDrawer = ({ open, onClose, inquiries }) => (
    <aside
        className={`inquiry-overlay-panel absolute bottom-4 left-5 top-16 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-[390px]'}`}
        dir="rtl"
        aria-hidden={!open}
    >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/50 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="inquiry-icon-chip flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
                    <Icon name="history" className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-black inquiry-primary-text">פניות פתוחות של הלקוח</h2>
                    <p className="text-[11px] font-bold inquiry-muted-text">מוצגות רק פניות שעדיין פתוחות</p>
                </div>
            </div>

            <button type="button" onClick={onClose} className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text">
                <Icon name="close" className="h-4 w-4" />
            </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--color-surface-muted)]/70 p-3">
            {inquiries.map((inquiry) => (
                <article key={inquiry.id} className="inquiry-panel rounded-2xl p-3 text-right shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{inquiry.status}</span>
                        <span className="text-sm font-black inquiry-primary-text">{inquiry.id}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[12px] font-bold inquiry-secondary-text">
                        <span className="rounded-full bg-red-50 px-2 py-1 text-red-500 dark:bg-red-500/10 dark:text-red-300">{inquiry.priority}</span>
                        <span>{inquiry.description}</span>
                    </div>

                    <button type="button" className="inquiry-control inquiry-control--active mt-3 h-8 rounded-lg px-4 text-xs font-black">
                        צפה
                    </button>
                </article>
            ))}
        </div>
    </aside>
);

export default CustomerHistoryDrawer;
