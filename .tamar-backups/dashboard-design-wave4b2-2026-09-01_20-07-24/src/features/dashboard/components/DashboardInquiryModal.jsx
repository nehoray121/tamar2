import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardToolbarPill } from './DashboardPrimitives.jsx';
import DashboardInquiryListItem from './DashboardInquiryListItem.jsx';

        const DashboardInquiryModal = ({ modalConfig, searchValue, onSearchChange, onClose }) => {
            if (!modalConfig.isOpen) return null;

            const query = searchValue.trim().toLowerCase();
            const visibleItems = query
                ? modalConfig.filteredData.filter(item => {
                    const haystack = `${item.id} ${item.requester} ${item.phone} ${item.assignee} ${item.priority} ${item.subject}`.toLowerCase();
                    return haystack.includes(query);
                })
                : modalConfig.filteredData;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
                    <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] shadow-[0_30px_80px_rgba(2,6,23,0.55)]" dir="rtl">
                        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-400">
                                        <Icon name="filter" className="w-3.5 h-3.5" /> Drill-down
                                    </div>
                                    <h2 className="text-2xl font-black text-[var(--color-text-primary)]">{modalConfig.title}</h2>
                                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{modalConfig.subtitle}</p>
                                </div>
                                <button type="button" onClick={onClose} className="rounded-full p-3 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]">
                                    <Icon name="close" className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <DashboardToolbarPill className="min-w-[260px]">
                                    <Icon name="search" className="w-4 h-4 text-[var(--color-text-muted)]" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => onSearchChange(event.target.value)}
                                        className="dashboard-inquiry-search-input w-full min-w-0 border-0 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                                        placeholder="חיפוש לפי מספר פנייה או שם..."
                                    />
                                </DashboardToolbarPill>
                                <div className="inquiry-soft-panel rounded-2xl px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] shadow-sm">
                                    {visibleItems.length} פניות מוצגות
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[var(--color-surface-muted)] p-5">
                            {visibleItems.length ? visibleItems.map(item => <DashboardInquiryListItem key={item.id} item={item} />) : (
                                <div className="flex h-80 flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]">
                                    <Icon name="search" className="w-12 h-12" />
                                    <p className="text-lg font-black">לא נמצאו פניות</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

export default DashboardInquiryModal;
