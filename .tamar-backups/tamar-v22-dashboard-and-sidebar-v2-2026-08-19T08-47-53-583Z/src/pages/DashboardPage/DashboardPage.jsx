import React, { useState } from 'react';
import DashboardHeader from '../../features/dashboard/components/DashboardHeader.jsx';
import DashboardInquiryModal from '../../features/dashboard/components/DashboardInquiryModal.jsx';
import DashboardKpiGrid from '../../features/dashboard/components/DashboardKpiGrid.jsx';
import ImmediateTreatmentPanel from '../../features/dashboard/components/ImmediateTreatmentPanel.jsx';
import KpiEditorModal from '../../features/dashboard/components/KpiEditorModal.jsx';
import PeriodicTrendCard from '../../features/dashboard/components/PeriodicTrendCard.jsx';
import UrgencyBreakdownCard from '../../features/dashboard/components/UrgencyBreakdownCard.jsx';
import WorkloadPanel from '../../features/dashboard/components/WorkloadPanel.jsx';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData.js';
import { useDashboardKpis } from '../../features/dashboard/hooks/useDashboardKpis.js';
import { useExpandedDashboardPanel } from '../../features/dashboard/hooks/useExpandedDashboardPanel.js';
import { useUrgencySelection } from '../../features/dashboard/hooks/useUrgencySelection.js';

const DashboardPage = () => {
    const dashboard = useDashboardData();
    const { data, status, error, retry, filters, setFilters, filteredBarData, groupedBarData, categoryOptions, sortOptions, hasActiveFilters } = dashboard;
    const inquiries = data.inquiries;
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', subtitle: '', filteredData: [] });
    const [modalSearch, setModalSearch] = useState('');
    const { expandedSection, setExpandedSection, fullSectionExpansion, toggleExpandedSection } = useExpandedDashboardPanel();

    const donutSource = hasActiveFilters ? filteredBarData : inquiries;
    const todayString = new Date().toISOString().split('T')[0];
    const now = new Date(`${todayString}T12:00:00`);
    const totalInquiries = data.metrics.total || 0;
    const {
        priorityData,
        donutCategories,
        visibleDonutCategories,
        hasHiddenDonutCategories,
        hiddenDonutCategoryCount,
        hiddenDonutInquiryCount,
        totalDonutCategoryCount,
        totalDonutInquiries,
        visibleDonutCategoryCards,
        selectedDonutCategory,
        visibleSelectedDonutInquiries,
        donutCategoryPage,
        setDonutCategoryPage,
        totalDonutCategoryPages,
        donutInquiryPage,
        setDonutInquiryPage,
        totalDonutInquiryPages,
        selectDonutCategory,
        formatDonutInquiryAge
    } = useUrgencySelection({ donutSource, prioritySource: data.priorityData, expandedSection, now });
    const {
        isKpiEditorOpen,
        selectedKpis,
        draftKpiIds,
        kpiDefinitions,
        undoState,
        openKpiEditor,
        closeKpiEditor,
        handleDraftAddKpi,
        handleDraftRemoveKpi,
        handleDraftMoveKpi,
        handleSaveKpiLayout,
        removeSelectedKpi,
        restoreRemovedKpi,
        dismissUndo
    } = useDashboardKpis({ metrics: data.metrics });

    const workloadRows = data.workload || [];

    const urgentQueueItems = React.useMemo(() => (data.attention || []).map((item) => {
        const createdAt = new Date(item.createdAt || `${item.date}T12:00:00`);
        const hoursOpen = Math.max(1, Math.round((now - createdAt) / 3600000));
        return {
            ...item,
            durationLabel: hoursOpen < 24 ? `${hoursOpen} שעות` : `${Math.max(1, Math.floor(hoursOpen / 24))} ימים`,
            assigneeLabel: item.assignee || 'ללא שיוך'
        };
    }), [data.attention, now]);

    const closeModal = () => {
        setModalSearch('');
        setModalConfig({ isOpen: false, title: '', subtitle: '', filteredData: [] });
    };

    const handleDonutClick = (segment) => {
        if (expandedSection === 'donut') {
            selectDonutCategory(segment.rawLabel);
            return;
        }

        const filtered = donutSource.filter((item) => item.priority === segment.rawLabel);
        setModalSearch('');
        setModalConfig({
            isOpen: true,
            title: `פניות לפי דחיפות: ${segment.label}`,
            subtitle: `${filtered.length} פניות נמצאו בחתך שנבחר`,
            filteredData: filtered
        });
    };

    const handleBarClick = (barData) => {
        setModalSearch('');
        setModalConfig({
            isOpen: true,
            title: `פניות לתקופה: ${barData.label}`,
            subtitle: `${barData.total} פניות לפי הסינון הנוכחי`,
            filteredData: barData.items
        });
    };

    const handleUrgentInspect = (item) => {
        setModalSearch('');
        setModalConfig({
            isOpen: true,
            title: `פנייה לטיפול: ${item.id}`,
            subtitle: `${item.requester} · ${item.priority}`,
            filteredData: [item]
        });
    };

    if (status === 'loading' || status === 'idle') {
        return <div dir="rtl" className="inquiry-page-surface flex h-full items-center justify-center text-sm font-black inquiry-secondary-text">טוען נתוני לוח בקרה...</div>;
    }
    if (status === 'error') {
        return (
            <div dir="rtl" className="inquiry-page-surface flex h-full items-center justify-center p-6">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-lg font-black inquiry-primary-text">לא ניתן לטעון את לוח הבקרה</h2>
                    <p className="mt-2 text-sm inquiry-secondary-text">{error}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">נסה שוב</button>
                </div>
            </div>
        );
    }
    return (
        <div dir="rtl" className={`tamar-reference-dashboard-page inquiry-page-surface wave-bg flex h-full min-h-0 flex-col overflow-hidden px-3 pb-3 pt-2 shadow-none ${fullSectionExpansion ? 'lg:p-3' : ''}`}>
            <DashboardHeader totalInquiries={totalInquiries} />

            <main className="tamar-reference-dashboard-main flex min-h-0 flex-1 flex-col overflow-hidden">
                <DashboardKpiGrid fullSectionExpansion={fullSectionExpansion} selectedKpis={selectedKpis} onEdit={openKpiEditor} onRemove={removeSelectedKpi} />

                <div className="min-h-0 flex-1 overflow-hidden">
                    {expandedSection === 'barChart' ? (
                        <div className="grid h-full min-h-0 grid-cols-12">
                            <div className="col-span-12 min-h-0">
                                <PeriodicTrendCard
                                    expandedSection={expandedSection}
                                    filteredBarData={filteredBarData}
                                    groupedBarData={groupedBarData}
                                    filters={filters}
                                    setFilters={setFilters}
                                    categoryOptions={categoryOptions}
                                    sortOptions={sortOptions}
                                    handleBarClick={handleBarClick}
                                    toggleExpandedSection={toggleExpandedSection}
                                />
                            </div>
                        </div>
                    ) : expandedSection === 'donut' ? (
                        <div className="grid h-full min-h-0 grid-cols-12">
                            <div className="col-span-12 min-h-0">
                                <UrgencyBreakdownCard
                                    expandedSection={expandedSection}
                                    setExpandedSection={setExpandedSection}
                                    priorityData={priorityData}
                                    visibleDonutCategories={visibleDonutCategories}
                                    hasHiddenDonutCategories={hasHiddenDonutCategories}
                                    hiddenDonutCategoryCount={hiddenDonutCategoryCount}
                                    hiddenDonutInquiryCount={hiddenDonutInquiryCount}
                                    totalDonutCategoryCount={totalDonutCategoryCount}
                                    totalDonutInquiries={totalDonutInquiries}
                                    visibleDonutCategoryCards={visibleDonutCategoryCards}
                                    donutCategories={donutCategories}
                                    selectedDonutCategory={selectedDonutCategory}
                                    visibleSelectedDonutInquiries={visibleSelectedDonutInquiries}
                                    donutCategoryPage={donutCategoryPage}
                                    setDonutCategoryPage={setDonutCategoryPage}
                                    totalDonutCategoryPages={totalDonutCategoryPages}
                                    donutInquiryPage={donutInquiryPage}
                                    setDonutInquiryPage={setDonutInquiryPage}
                                    totalDonutInquiryPages={totalDonutInquiryPages}
                                    selectDonutCategory={selectDonutCategory}
                                    handleDonutClick={handleDonutClick}
                                    handleUrgentInspect={handleUrgentInspect}
                                    formatDonutInquiryAge={formatDonutInquiryAge}
                                    toggleExpandedSection={toggleExpandedSection}
                                />
                            </div>
                        </div>
                    ) : (
                        <div dir="ltr" className="tamar-reference-dashboard-layout dashboard-motion grid h-full min-h-0 grid-cols-12 grid-rows-[minmax(300px,400px)_minmax(158px,178px)] gap-2">
                            {expandedSection !== 'workload' && (
                                <div className="dashboard-motion col-span-12 min-h-0 lg:col-span-4 lg:col-start-1 lg:row-start-1">
                                    <UrgencyBreakdownCard
                                        expandedSection={expandedSection}
                                        setExpandedSection={setExpandedSection}
                                        priorityData={priorityData}
                                        visibleDonutCategories={visibleDonutCategories}
                                        hasHiddenDonutCategories={hasHiddenDonutCategories}
                                        hiddenDonutCategoryCount={hiddenDonutCategoryCount}
                                        hiddenDonutInquiryCount={hiddenDonutInquiryCount}
                                        totalDonutCategoryCount={totalDonutCategoryCount}
                                        totalDonutInquiries={totalDonutInquiries}
                                        visibleDonutCategoryCards={visibleDonutCategoryCards}
                                        donutCategories={donutCategories}
                                        selectedDonutCategory={selectedDonutCategory}
                                        visibleSelectedDonutInquiries={visibleSelectedDonutInquiries}
                                        donutCategoryPage={donutCategoryPage}
                                        setDonutCategoryPage={setDonutCategoryPage}
                                        totalDonutCategoryPages={totalDonutCategoryPages}
                                        donutInquiryPage={donutInquiryPage}
                                        setDonutInquiryPage={setDonutInquiryPage}
                                        totalDonutInquiryPages={totalDonutInquiryPages}
                                        selectDonutCategory={selectDonutCategory}
                                        handleDonutClick={handleDonutClick}
                                        handleUrgentInspect={handleUrgentInspect}
                                        formatDonutInquiryAge={formatDonutInquiryAge}
                                        toggleExpandedSection={toggleExpandedSection}
                                    />
                                </div>
                            )}

                            {expandedSection !== 'urgentQueue' && (
                                <div className="dashboard-motion col-span-12 min-h-0 lg:col-span-8 lg:col-start-5 lg:row-start-1">
                                    <PeriodicTrendCard
                                        expandedSection={expandedSection}
                                        filteredBarData={filteredBarData}
                                        groupedBarData={groupedBarData}
                                        filters={filters}
                                        setFilters={setFilters}
                                        categoryOptions={categoryOptions}
                                        sortOptions={sortOptions}
                                        handleBarClick={handleBarClick}
                                        toggleExpandedSection={toggleExpandedSection}
                                    />
                                </div>
                            )}

                            <div className={`dashboard-motion col-span-12 min-h-0 lg:col-start-1 ${expandedSection === 'workload' ? 'lg:col-span-4 lg:row-span-2' : 'lg:col-span-4 lg:row-start-2'}`}>
                                <WorkloadPanel
                                    rows={workloadRows}
                                    expanded={expandedSection === 'workload'}
                                    onToggle={() => toggleExpandedSection('workload')}
                                />
                            </div>

                            <div className={`dashboard-motion col-span-12 min-h-0 lg:col-start-5 ${expandedSection === 'urgentQueue' ? 'lg:col-span-8 lg:row-span-2' : 'lg:col-span-8 lg:row-start-2'}`}>
                                <ImmediateTreatmentPanel
                                    items={urgentQueueItems}
                                    expanded={expandedSection === 'urgentQueue'}
                                    onToggle={() => toggleExpandedSection('urgentQueue')}
                                    onInspect={handleUrgentInspect}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <DashboardInquiryModal
                modalConfig={modalConfig}
                searchValue={modalSearch}
                onSearchChange={setModalSearch}
                onClose={closeModal}
            />
            <KpiEditorModal
                isOpen={isKpiEditorOpen}
                onClose={closeKpiEditor}
                selectedIds={draftKpiIds}
                kpiDefinitions={kpiDefinitions}
                onMove={handleDraftMoveKpi}
                onAdd={handleDraftAddKpi}
                onRemove={handleDraftRemoveKpi}
                onSave={handleSaveKpiLayout}
            />
            {undoState && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-[95] -translate-x-1/2">
                    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_16px_35px_rgba(15,23,42,0.16)]">
                        <span>הכרטיס הוסר מהדשבורד</span>
                        <button type="button" onClick={restoreRemovedKpi} className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 transition hover:bg-blue-100">בטל</button>
                        <button type="button" onClick={dismissUndo} className="rounded-xl px-2 py-1 text-xs font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">סגור</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;





