import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardBadge } from './DashboardPrimitives.jsx';
import { formatDashboardDate } from '../utils/dashboard.utils.js';

        const DashboardInquiryListItem = ({ item }) => (
            <article className="group mb-3 flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-sm transition-all hover:border-blue-500/35 hover:shadow-md">
                <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className="rounded-xl bg-emerald-500 p-2 text-white transition-colors hover:bg-emerald-600">
                        <Icon name="check" className="w-4 h-4" />
                    </button>
                    <button type="button" className="rounded-xl bg-slate-900 p-2 text-white transition-colors hover:bg-slate-700">
                        <Icon name="eye" className="w-4 h-4" />
                    </button>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 font-black text-[var(--color-text-primary)]">
                            <Icon name="user" className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />
                            <span className="truncate">{item.requester}</span>
                            <DashboardBadge className={item.priorityColor}>{item.priority}</DashboardBadge>
                            <DashboardBadge className={item.status === 'open' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-[var(--color-text-secondary)] ring-slate-200'}>
                                {item.status === 'open' ? 'פתוחה' : 'סגורה'}
                            </DashboardBadge>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]" dir="ltr">
                            <span>{item.id}</span>
                            <span className="text-blue-500">#</span>
                        </div>
                    </div>
                    <div className="grid gap-2 text-xs font-medium text-[var(--color-text-secondary)] sm:grid-cols-4">
                        <span className="flex items-center gap-1"><Icon name="calendar" className="w-3.5 h-3.5" />{formatDashboardDate(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><Icon name="phone" className="w-3.5 h-3.5" /><span dir="ltr">{item.phone}</span></span>
                        <span className="flex items-center gap-1"><Icon name="location" className="w-3.5 h-3.5" />{item.location}</span>
                        <span className="flex items-center gap-1"><Icon name="filter" className="w-3.5 h-3.5" />{item.assignee}</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[var(--color-text-secondary)]"><span className="font-bold text-[var(--color-text-primary)]">{item.subject}:</span> {item.description}</p>
                </div>
            </article>
        );

export default DashboardInquiryListItem;
