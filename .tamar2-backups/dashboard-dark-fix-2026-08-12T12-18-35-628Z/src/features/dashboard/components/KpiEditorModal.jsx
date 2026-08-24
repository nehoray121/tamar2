import React, { useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import KpiCard from './DashboardKpiCard.jsx';

const KpiEditorModal = ({ isOpen, onClose, selectedIds, kpiDefinitions, onMove, onAdd, onRemove, onSave }) => {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const visibleKpis = selectedIds.map(id => kpiDefinitions.find(kpi => kpi.id === id)).filter(Boolean);
    const hiddenKpis = kpiDefinitions.filter(kpi => !selectedIds.includes(kpi.id));
    const canAddMore = selectedIds.length < 6;
    const canRemoveMore = selectedIds.length > 0;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
            <button type="button" aria-label="סגור חלון עריכת כרטיסיות" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />

            <div dir="rtl" className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] animate-fade-in">
                <div className="relative border-b border-slate-100 px-6 pb-5 pt-7 text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור חלון עריכת כרטיסיות"
                        className="absolute left-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    >
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                    <h2 className="text-[30px] font-black tracking-tight text-slate-900">עריכת כרטיסיות המידע</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-400">בחר אילו כרטיסיות יופיעו, סדר אותן מחדש, ושמור עד 6 כרטיסים פעילים.</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">כרטיסים מוצגים</h3>
                            <p className="text-sm font-semibold text-slate-400">{selectedIds.length} מתוך 6 יוצגו בדשבורד</p>
                        </div>
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                            עד 6 כרטיסים
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {visibleKpis.map((kpi, index) => (
                            <div key={kpi.id} className="space-y-2">
                                <KpiCard
                                    {...kpi}
                                    mode="modal"
                                    actionIcon="trash"
                                    actionLabel={`הסר כרטיסייה ${kpi.title}`}
                                    onAction={() => onRemove(kpi.id)}
                                    isActionDisabled={!canRemoveMore}
                                />
                                <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                    <span className="text-xs font-black text-slate-500">מיקום {index + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onMove(index, index - 1)}
                                            disabled={index === 0}
                                            className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Icon name="arrowUpStraight" className="h-3.5 w-3.5" /> למעלה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onMove(index, index + 1)}
                                            disabled={index === visibleKpis.length - 1}
                                            className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Icon name="arrowDownStraight" className="h-3.5 w-3.5" /> למטה
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-black text-slate-900">כרטיסים זמינים להוספה</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-400">כרטיסים מוסתרים נשמרים זמינים להחזרה מיידית.</p>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {hiddenKpis.length ? hiddenKpis.map(kpi => (
                                <div key={kpi.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-800">{kpi.title}</div>
                                        {kpi.subtitle && <div className="mt-1 truncate text-xs font-semibold text-slate-400">{kpi.subtitle}</div>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onAdd(kpi.id)}
                                        disabled={!canAddMore}
                                        className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                        <Icon name="plus" className="h-3.5 w-3.5" /> שחזר
                                    </button>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400 sm:col-span-2">
                                    כל ששת הכרטיסים כבר מוצגים.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        ביטול
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="rounded-2xl bg-blue-600 px-6 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                    >
                        שמור כרטיסיות
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KpiEditorModal;
