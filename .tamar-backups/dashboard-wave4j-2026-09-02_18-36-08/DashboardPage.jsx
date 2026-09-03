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
import { useSessionStore } from '../../store/session.store.js';

const DashboardPage = () => {
    const dashboard = useDashboardData();
    const navigate = useSessionStore((state) => state.navigate);
    const {
        data,
        status,
        error,
        retry,
        filters,
        setFilters,
        filteredBarData,
        groupedBarData,
        categoryOptions,
        sortOptions,
        hasActiveFilters
    } = dashboard;

    const inquiries = data.inquiries;
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        subtitle: '',
        filteredData: []
    });
    const [modalSearch, setModalSearch] = useState('');
    const {
        expandedSection,
        fullSectionExpansion,
        toggleExpandedSection
    } = useExpandedDashboardPanel();

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
    } = useUrgencySelection({
        donutSource,
        prioritySource: data.priorityData,
        expandedSection,
        now
    });

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

    const urgentQueueItems = React.useMemo(
        () => (data.attention || []).map((item) => {
            const createdAt = new Date(
                item.createdAt || `${item.date}T12:00:00`
            );
            const hoursOpen = Math.max(
                1,
                Math.round((now - createdAt) / 3600000)
            );

            return {
                ...item,
                durationLabel: hoursOpen < 24
                    ? `${hoursOpen} שעות`
                    : `${Math.max(1, Math.floor(hoursOpen / 24))} ימים`,
                assigneeLabel: item.assignee || 'ללא שיוך'
            };
        }),
        [data.attention, now]
    );

    const closeModal = () => {
        setModalSearch('');
        setModalConfig({
            isOpen: false,
            title: '',
            subtitle: '',
            filteredData: []
        });
    };

    const handleDonutClick = (segment) => {
        if (expandedSection === 'donut') {
            selectDonutCategory(segment.rawLabel);
            return;
        }

        const filtered = donutSource.filter(
            (item) => item.priority === segment.rawLabel
        );

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
        return (
            <div dir="rtl" className="dashboard-gate-v4b">
                <span className="dashboard-spinner-v4b" aria-hidden="true" />
                <span>טוען נתוני לוח בקרה...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div dir="rtl" className="dashboard-gate-v4b">
                <section className="dashboard-error-v4b">
                    <h2>לא ניתן לטעון את לוח הבקרה</h2>
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={retry}
                        className="tamar-ui-btn tamar-ui-btn--primary"
                    >
                        נסה שוב
                    </button>
                </section>
            </div>
        );
    }

    const renderTrendCard = () => (
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
    );

    const renderUrgencyCard = () => (
        <UrgencyBreakdownCard
            expandedSection={expandedSection}
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
    );

    const renderWorkloadCard = () => (
        <WorkloadPanel
            rows={workloadRows}
            expanded={expandedSection === 'workload'}
            onToggle={() => toggleExpandedSection('workload')}
        />
    );

    const renderAttentionCard = () => (
        <ImmediateTreatmentPanel
            items={urgentQueueItems}
            expanded={expandedSection === 'urgentQueue'}
            onToggle={() => toggleExpandedSection('urgentQueue')}
            onInspect={handleUrgentInspect}
        />
    );

    const isBarColumnExpanded = expandedSection === 'barChart'
        || expandedSection === 'urgentQueue';
    const isDonutColumnExpanded = expandedSection === 'donut'
        || expandedSection === 'workload';
    const isPrimaryExpanded = fullSectionExpansion;

    const renderBarColumn = () => {
        if (expandedSection === 'barChart') {
            return renderTrendCard();
        }

        if (expandedSection === 'urgentQueue') {
            return renderAttentionCard();
        }

        return (
            <>
                <div className="dashboard-column-v4e__cell">
                    {renderTrendCard()}
                </div>
                <div className="dashboard-column-v4e__cell">
                    {renderAttentionCard()}
                </div>
            </>
        );
    };

    const renderDonutColumn = () => {
        if (expandedSection === 'donut') {
            return renderUrgencyCard();
        }

        if (expandedSection === 'workload') {
            return renderWorkloadCard();
        }

        return (
            <>
                <div className="dashboard-column-v4e__cell">
                    {renderUrgencyCard()}
                </div>
                <div className="dashboard-column-v4e__cell">
                    {renderWorkloadCard()}
                </div>
            </>
        );
    };

    return (
        <div dir="rtl" className="dashboard-page-v4b">
            {isPrimaryExpanded ? (
                <main className="dashboard-primary-expanded-v4f">
                    {expandedSection === 'barChart'
                        ? renderTrendCard()
                        : renderUrgencyCard()}
                </main>
            ) : (
                <>
                    <DashboardHeader
                        totalInquiries={totalInquiries}
                        onEdit={openKpiEditor}
                        onCreateInquiry={() => navigate('new_complaint')}
                    />

                    <main className="dashboard-main-v4b">
                        <DashboardKpiGrid
                            fullSectionExpansion={fullSectionExpansion}
                            selectedKpis={selectedKpis}
                            onEdit={openKpiEditor}
                            onRemove={removeSelectedKpi}
                        />

                        <div className="dashboard-stage-v4b">
                            <div className="dashboard-columns-v4e">
                                <div
                                    className={`dashboard-column-v4e dashboard-column-v4e--bar ${
                                        isBarColumnExpanded
                                            ? 'dashboard-column-v4e--expanded'
                                            : ''
                                    }`}
                                >
                                    {renderBarColumn()}
                                </div>

                                <div
                                    className={`dashboard-column-v4e dashboard-column-v4e--donut ${
                                        isDonutColumnExpanded
                                            ? 'dashboard-column-v4e--expanded'
                                            : ''
                                    }`}
                                >
                                    {renderDonutColumn()}
                                </div>
                            </div>
                        </div>
                    </main>
                </>
            )}

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
                <div className="dashboard-undo-layer-v4b">
                    <div className="dashboard-undo-v4b">
                        <span>הכרטיס הוסר מהדשבורד</span>
                        <button
                            type="button"
                            onClick={restoreRemovedKpi}
                            className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                        >
                            בטל
                        </button>
                        <button
                            type="button"
                            onClick={dismissUndo}
                            className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--ghost"
                        >
                            סגור
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
