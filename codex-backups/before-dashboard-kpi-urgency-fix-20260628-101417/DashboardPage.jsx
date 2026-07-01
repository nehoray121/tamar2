import React, { useState } from 'react';
import { dashboardInquiries } from '../../features/dashboard/data/dashboard.mock.js';
import { formatDashboardShortName } from '../../features/dashboard/utils/dashboard.utils.js';
import DashboardHeader from '../../features/dashboard/components/DashboardHeader.jsx';
import DashboardInquiryModal from '../../features/dashboard/components/DashboardInquiryModal.jsx';
import DashboardKpiGrid from '../../features/dashboard/components/DashboardKpiGrid.jsx';
import ImmediateTreatmentPanel from '../../features/dashboard/components/ImmediateTreatmentPanel.jsx';
import KpiEditorModal from '../../features/dashboard/components/KpiEditorModal.jsx';
import PeriodicTrendCard from '../../features/dashboard/components/PeriodicTrendCard.jsx';
import UrgencyBreakdownCard from '../../features/dashboard/components/UrgencyBreakdownCard.jsx';
import WorkloadPanel from '../../features/dashboard/components/WorkloadPanel.jsx';
import { useDashboardFilters } from '../../features/dashboard/hooks/useDashboardFilters.js';
import { useDashboardKpis } from '../../features/dashboard/hooks/useDashboardKpis.js';
import { useExpandedDashboardPanel } from '../../features/dashboard/hooks/useExpandedDashboardPanel.js';
import { useUrgencySelection } from '../../features/dashboard/hooks/useUrgencySelection.js';

const DashboardPage = () => {
    const inquiries = dashboardInquiries;
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', subtitle: '', filteredData: [] });
    const [modalSearch, setModalSearch] = useState('');
    const { expandedSection, setExpandedSection, fullSectionExpansion, toggleExpandedSection } = useExpandedDashboardPanel();
    const { filters, setFilters, filteredBarData, groupedBarData, categoryOptions, sortOptions, hasActiveFilters } = useDashboardFilters(inquiries);

    const donutSource = hasActiveFilters ? filteredBarData : inquiries;
    const todayString = new Date().toISOString().split('T')[0];
    const now = new Date(`${todayString}T12:00:00`);
    const openedToday = inquiries.filter((item) => item.date === todayString).length;
    const totalInquiries = inquiries.length;
    const openInquiries = inquiries.filter((item) => item.status === 'open').length;
    const closedInquiries = inquiries.filter((item) => item.status === 'closed').length;
    const {
        priorityData,
        donutCategories,
        visibleDonutCategories,
        hasHiddenDonutCategories,
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
    } = useUrgencySelection({ donutSource, expandedSection, now });
    const {
        isKpiEditorOpen,
        selectedKpis,
        draftKpiIds,
        kpiDefinitions,
        openKpiEditor,
        closeKpiEditor,
        handleDraftAddKpi,
        handleDraftRemoveKpi,
        handleDraftMoveKpi,
        handleSaveKpiLayout
    } = useDashboardKpis({ openedToday, openInquiries, closedInquiries });

    const workloadRows = React.useMemo(() => {
        const groupedRows = inquiries
            .filter((item) => item.status === 'open')
            .reduce((accumulator, item) => {
                if (!accumulator[item.requester]) {
                    accumulator[item.requester] = { name: formatDashboardShortName(item.requester), total: 0, urgent: 0 };
                }

                accumulator[item.requester].total += 1;
                if (item.priority === 'גבוהה-1') {
                    accumulator[item.requester].urgent += 1;
                }

                return accumulator;
            }, {});

        return Object.values(groupedRows).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'he'));
    }, [inquiries]);

    const urgentQueueItems = React.useMemo(() => {
        return inquiries
            .filter((item) => item.status === 'open')
            .sort((a, b) => a.priorityLevel - b.priorityLevel || a.date.localeCompare(b.date))
            .slice(0, 10)
            .map((item, index) => {
                const hoursOpen = Math.max(1, Math.round((now - new Date(`${item.date}T12:00:00`)) / 3600000));
                const durationLabel = hoursOpen < 24
                    ? `${Math.min(12, 4 + ((index * 3) % 8))} שעות`
                    : `${Math.max(1, Math.floor(hoursOpen / 24))} ימים`;

                return {
                    ...item,
                    durationLabel,
                    assigneeLabel: index % 3 === 0 ? 'ללא שיוך' : formatDashboardShortName(item.requester)
                };
            });
    }, [inquiries, now]);

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
            subtitle: `${item.requester} ֲ· ${item.priority}`,
            filteredData: [item]
        });
    };

    return (
        <div dir="rtl" className={`flex h-full min-h-0 flex-col overflow-hidden p-3 text-slate-800 wave-bg ${fullSectionExpansion ? 'lg:p-4' : ''}`}>
            <DashboardHeader totalInquiries={totalInquiries} />

            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <DashboardKpiGrid fullSectionExpansion={fullSectionExpansion} selectedKpis={selectedKpis} onEdit={openKpiEditor} />

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
                        <div dir="ltr" className="dashboard-motion grid h-full min-h-0 grid-cols-12 grid-rows-[minmax(320px,1fr)_minmax(140px,160px)] gap-3 lg:gap-4">
                            {expandedSection !== 'workload' && (
                                <div className="dashboard-motion col-span-12 min-h-0 lg:col-span-4 lg:col-start-1 lg:row-start-1">
                                    <UrgencyBreakdownCard
                                        expandedSection={expandedSection}
                                        setExpandedSection={setExpandedSection}
                                        priorityData={priorityData}
                                        visibleDonutCategories={visibleDonutCategories}
                                        hasHiddenDonutCategories={hasHiddenDonutCategories}
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
        </div>
    );
};

export default DashboardPage;
