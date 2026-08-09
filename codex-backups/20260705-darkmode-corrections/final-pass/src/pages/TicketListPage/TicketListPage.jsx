import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import TicketModal from './TicketModal.jsx';
import { InquiryListRow } from '../../features/tickets/components/InquiryListRow.jsx';
import InquiryCategoriesDropdown from '../../features/tickets/components/InquiryCategoriesDropdown.jsx';
import InquiryBulkActions from '../../features/tickets/components/InquiryBulkActions.jsx';
import CloseInquiryDialog from '../../features/tickets/components/CloseInquiryDialog.jsx';
import { useInquiryOrganization } from '../../features/tickets/hooks/useInquiryOrganization.js';

const toolbarButton = 'flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#C9E1FF] bg-white px-3.5 text-[12px] font-black text-slate-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition hover:border-[#93C5FD] hover:bg-[#EAF4FF] hover:text-[#3B82F6]';

const TicketListPage = ({ title, description, showToggle = false, viewType = 'default' }) => {
    const [toggleState, setToggleState] = useState('received');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [closingTicket, setClosingTicket] = useState(null);
    const [draggedTicketId, setDraggedTicketId] = useState(null);
    const [searchBy, setSearchBy] = useState({ label: 'מספר פניה', iconText: '#' });
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
    const [sortBy, setSortBy] = useState('מספר פנייה ↑↓');
    const [priorityFilter, setPriorityFilter] = useState('בחר דחיפות');
    const organization = useInquiryOrganization({ viewType, toggleState });

    const closeAllDropdowns = () => {
        setSearchDropdownOpen(false);
        setSortDropdownOpen(false);
        setPriorityDropdownOpen(false);
    };

    const showOrganizationTools = viewType !== 'history';
    const canManualOrder = organization.selectedCategoryId !== 'all';
    const categoryById = new Map(organization.categories.map((category) => [category.id, category]));
    const items = organization.tickets.filter((ticket) => {
        if (priorityFilter === 'בחר דחיפות') return true;
        return ticket.priority.includes(priorityFilter.replace('דחיפות ', '').replace('גבוהה', 'גבוהה').replace('בינונית', 'בינונית').replace('נמוכה', 'נמוכה'));
    });

    const handleDrop = (targetId) => {
        if (!draggedTicketId || draggedTicketId === targetId) return;
        const orderedIds = items.map((item) => item.id);
        const from = orderedIds.indexOf(draggedTicketId);
        const to = orderedIds.indexOf(targetId);
        orderedIds.splice(from, 1);
        orderedIds.splice(to, 0, draggedTicketId);
        organization.saveManualOrder(orderedIds);
        setDraggedTicketId(null);
    };

    const searchOptions = [
        { label: 'מספר פניה', iconText: '#' },
        { label: 'שם לקוח', iconName: 'user' },
        { label: 'מס טלפון', iconName: 'phone' },
        { label: 'גורם מטפל', iconName: 'search' }
    ];
    const priorityOptions = ['בחר דחיפות', 'דחיפות גבוהה', 'דחיפות בינונית', 'דחיפות נמוכה'];

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden bg-[#EEF4FC] p-4" dir="rtl">
            {(searchDropdownOpen || sortDropdownOpen || priorityDropdownOpen) && <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />}

            <PageHeader
                title={title}
                description={description}
                toggleState={toggleState}
                setToggleState={setToggleState}
                showToggle={showToggle}
            />

            <div className="relative z-40 mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex h-9 min-w-[320px] flex-1 rounded-xl border border-[#C9E1FF] bg-white shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-blue-400/20 lg:max-w-[600px]">
                    <div className="relative border-l border-[#C9E1FF]">
                        <button onClick={() => { closeAllDropdowns(); setSearchDropdownOpen(!searchDropdownOpen); }} className="flex h-full items-center gap-2 rounded-r-xl bg-[#EAF4FF] px-3 text-[12px] font-black text-[#3B82F6]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[#C9E1FF] bg-white text-xs leading-none">{searchBy.iconText || <Icon name={searchBy.iconName} className="h-3.5 w-3.5" />}</span>
                            {searchBy.label}
                            <Icon name="chevronDown" className="h-3 w-3" />
                        </button>
                        {searchDropdownOpen && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                                {searchOptions.map((opt) => <button key={opt.label} onClick={() => { setSearchBy(opt); closeAllDropdowns(); }} className="flex w-full items-center gap-2 px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF]">{opt.label}</button>)}
                            </div>
                        )}
                    </div>
                    <div className="relative flex flex-1 items-center px-3">
                        <input className="h-full w-full bg-transparent py-2 pl-8 pr-1 text-[12px] font-semibold text-slate-700 outline-none placeholder:text-[#93C5FD]" placeholder={`חפש על ידי ${searchBy.label}...`} />
                        <Icon name="search" className="absolute left-3 h-4 w-4 text-[#3B82F6]" />
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2.5">
                    {showOrganizationTools && (
                        <InquiryCategoriesDropdown
                            categories={organization.categories}
                            counts={organization.categoryCounts}
                            selectedId={organization.selectedCategoryId}
                            onSelect={organization.setSelectedCategoryId}
                            onCreate={organization.createCategory}
                            onRename={organization.renameCategory}
                            onDelete={organization.deleteCategory}
                        />
                    )}
                    <button onClick={() => { closeAllDropdowns(); setSortDropdownOpen(!sortDropdownOpen); }} className={toolbarButton}>
                        <Icon name="arrowDownUp" className="h-3.5 w-3.5 text-[#3B82F6]" />
                        {sortBy}
                        <Icon name="chevronDown" className="h-3 w-3 text-[#3B82F6]" />
                    </button>
                    {sortDropdownOpen && (
                        <div className="absolute top-10 z-50 w-44 rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                            {['מספר פנייה ↑↓', 'חדש יותר', 'ישן יותר'].map((opt) => <button key={opt} onClick={() => { setSortBy(opt); closeAllDropdowns(); }} className="block w-full px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF]">{opt}</button>)}
                        </div>
                    )}
                    <div className="relative">
                        <button onClick={() => { closeAllDropdowns(); setPriorityDropdownOpen(!priorityDropdownOpen); }} className={toolbarButton}>
                            <Icon name="filter" className="h-3.5 w-3.5 text-[#3B82F6]" />
                            {priorityFilter}
                            <Icon name="chevronDown" className="h-3 w-3 text-[#3B82F6]" />
                        </button>
                        {priorityDropdownOpen && (
                            <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                                {priorityOptions.map((opt) => <button key={opt} onClick={() => { setPriorityFilter(opt); closeAllDropdowns(); }} className="w-full px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF]">{opt}</button>)}
                            </div>
                        )}
                    </div>
                    {showOrganizationTools && canManualOrder && (
                        <button type="button" onClick={() => organization.setManualMode((value) => !value)} className={`${toolbarButton} ${organization.manualMode ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}>
                            <Icon name="grip" className="h-3.5 w-3.5 text-[#3B82F6]" />
                            סדר אישי
                        </button>
                    )}
                    {showOrganizationTools && (
                        <InquiryBulkActions
                            active={organization.selectionMode}
                            selectedCount={organization.selectedIds.length}
                            categories={organization.categories}
                            onStart={() => organization.setSelectionMode(true)}
                            onCancel={organization.clearSelection}
                            onAssignCategory={organization.assignManyCategory}
                            onClearCategory={() => organization.assignManyCategory('all')}
                            onPin={() => organization.setManyPinned(true)}
                            onUnpin={() => organization.setManyPinned(false)}
                        />
                    )}
                </div>
            </div>

            {organization.error && <div className="mb-2 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{organization.error}</div>}

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-1">
                {items.length > 0 ? items.map((task) => (
                    <InquiryListRow
                        key={`${toggleState}-${task.id}`}
                        ticket={task}
                        viewType={viewType}
                        toggleState={toggleState}
                        categories={organization.categories}
                        category={categoryById.get(task.categoryId)}
                        onTogglePin={showOrganizationTools ? organization.togglePin : undefined}
                        onAssignCategory={showOrganizationTools ? organization.assignCategory : undefined}
                        onCloseInquiry={viewType === 'open' ? setClosingTicket : undefined}
                        loading={organization.loadingIds.includes(task.id)}
                        selectionMode={organization.selectionMode}
                        selected={organization.selectedIds.includes(task.id)}
                        onToggleSelection={() => organization.toggleSelection(task.id)}
                        manualMode={organization.manualMode}
                        draggable={organization.manualMode && canManualOrder}
                        onDragStart={() => setDraggedTicketId(task.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDrop(task.id)}
                        onView={setSelectedTicket}
                    />
                )) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#C9E1FF] bg-white/70 text-slate-400">
                        <Icon name="filePlus" className="mb-2 h-10 w-10" />
                        <p className="text-sm font-bold">אין פניות להצגה</p>
                    </div>
                )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-center gap-3 border-t border-[#C9E1FF]/70 pt-3">
                <button className="rounded-lg border border-[#C9E1FF] bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-[0_3px_10px_rgba(37,99,235,0.08)]">הבא &lt;</button>
                <div className="rounded-lg border border-[#C9E1FF] bg-[#EAF4FF] px-8 py-1.5 text-xs font-bold text-[#3B82F6] shadow-[0_3px_10px_rgba(37,99,235,0.08)]">עמוד 1 מתוך 4</div>
                <button className="rounded-lg border border-[#C9E1FF] bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-[0_3px_10px_rgba(37,99,235,0.08)]">&gt; קודם</button>
            </div>

            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    viewType={viewType}
                    transferContext={toggleState}
                    onClose={() => setSelectedTicket(null)}
                    onCloseInquiry={() => setClosingTicket(selectedTicket)}
                />
            )}
            <CloseInquiryDialog open={Boolean(closingTicket)} ticket={closingTicket} onClose={() => setClosingTicket(null)} onClosed={(ticket) => setSelectedTicket((current) => current?.id === ticket.id ? null : current)} />
        </div>
    );
};

export default TicketListPage;
