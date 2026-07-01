import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import TicketModal from './TicketModal.jsx';
import { InquiryListRow } from '../../features/tickets/components/InquiryListRow.jsx';

const toolbarButton = 'flex h-9 items-center gap-2 rounded-lg border border-[#C9E1FF] bg-white px-3 text-[12px] font-black text-slate-700 shadow-[0_3px_10px_rgba(37,99,235,0.08)] transition hover:border-[#93C5FD] hover:bg-[#EAF4FF] hover:text-[#3B82F6]';

const TicketListPage = ({ title, description, showToggle = false, isExternal = false, viewType = 'default' }) => {
    const [toggleState, setToggleState] = useState('received'); // 'received' or 'sent'
    const [selectedTicket, setSelectedTicket] = useState(null);

    const [searchBy, setSearchBy] = useState({ label: 'מספר פניה', iconText: '#' });
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

    const [sortBy, setSortBy] = useState('מספר פנייה ↑↓');
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

    const [priorityFilter, setPriorityFilter] = useState('בחר דחיפות');
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

    const searchOptions = [
        { label: 'מספר פניה', iconText: '#' },
        { label: 'שם לקוח', iconName: 'user' },
        { label: 'מס טלפון', iconName: 'phone' },
        { label: 'גורם מטפל', iconName: 'search' },
        { label: 'מ.א של לקוח', iconName: 'search' },
        { label: 'טלפון ליצירת קשר', iconName: 'phone' }
    ];

    const sortOptions = [
        { label: 'מספר פנייה', sortType: 'up', iconName: 'arrowUpStraight' },
        { label: 'מספר פנייה', sortType: 'down', iconName: 'arrowDownStraight' },
        { label: 'חדש יותר', iconName: 'calendar' },
        { label: 'ישן יותר', iconName: 'calendar' }
    ];

    const priorityOptions = ['בחר דחיפות', 'דחיפות גבוהה', 'דחיפות בינונית', 'דחיפות נמוכה'];

    const closeAllDropdowns = () => {
        setSearchDropdownOpen(false);
        setSortDropdownOpen(false);
        setPriorityDropdownOpen(false);
    };

    const items = isExternal ? [
        { id: 'M-16-338...', priority: 'נמוכה-3', name: 'עטיה נהוראי', room: '44444444444', phone: 'לא זמין', date: '12 ביוני 2026' },
    ] : [
        { id: 'M-16-338...', priority: 'נמוכה-3', name: 'עטיה נהוראי', room: '44444444444', phone: 'לא זמין', date: '12 ביוני 2026' },
        { id: '26T3933', priority: 'נמוכה-3', name: 'עטיה נהוראי', room: '555345345', phone: 'לא זמין', date: '11 ביוני 2026' },
        { id: 'A-22-192...', priority: 'גבוהה-1', name: 'משה כהן', room: '33333333333', phone: '050-1234567', date: '10 ביוני 2026' },
        { id: 'B-88-123...', priority: 'נמוכה-3', name: 'דנה לוי', room: '22222222222', phone: '054-9876543', date: '09 ביוני 2026' },
        { id: 'C-44-555...', priority: 'גבוהה-1', name: 'רועי שמש', room: '11111111111', phone: 'לא זמין', date: '08 ביוני 2026' },
    ];

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#EEF4FC] p-5" dir="rtl">
            {(searchDropdownOpen || sortDropdownOpen || priorityDropdownOpen) && (
                <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            )}

            <header className="relative z-10 mb-4 shrink-0">
                <div>
                    <div>
                        <h1 className="mb-1 text-[24px] font-black tracking-tight text-[#0F172A]">{title}</h1>
                        <p className="text-[13px] font-semibold text-slate-500">{description}</p>
                    </div>

                    {showToggle && (
                        <div className="absolute top-0 left-0 bg-[#E5E7EB] p-1 rounded-full flex shadow-inner w-[240px]">
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out"
                                style={{
                                    transform: toggleState === 'received' ? 'translateX(0)' : 'translateX(-100%)',
                                    right: '4px'
                                }}
                            />

                            <button
                                onClick={() => setToggleState('received')}
                                className={`flex-1 relative z-10 py-1.5 text-xs font-bold transition-colors duration-300 ${toggleState === 'received' ? 'text-[#1E4DB7]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                פניות שהתקבלו
                            </button>
                            <button
                                onClick={() => setToggleState('sent')}
                                className={`flex-1 relative z-10 py-1.5 text-xs font-bold transition-colors duration-300 ${toggleState === 'sent' ? 'text-[#1E4DB7]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                פניות שנשלחו
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="relative z-40 mb-4 flex shrink-0 items-center justify-between gap-4">
                <div className="flex h-9 w-full max-w-[520px] rounded-lg border border-[#C9E1FF] bg-white shadow-[0_3px_10px_rgba(37,99,235,0.08)] transition focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-blue-400/20">
                    <div className="relative border-l border-[#C9E1FF]">
                        <button
                            onClick={() => { closeAllDropdowns(); setSearchDropdownOpen(!searchDropdownOpen); }}
                            className="flex h-full items-center gap-2 rounded-r-lg bg-[#EAF4FF] px-3 text-[12px] font-black text-[#3B82F6] transition hover:bg-[#DDEEFF]"
                            title={searchBy.label}
                        >
                            {searchBy.iconText ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[#C9E1FF] bg-white text-xs leading-none">{searchBy.iconText}</span>
                            ) : (
                                <Icon name={searchBy.iconName} className="h-3.5 w-3.5" />
                            )}
                            {searchBy.label.length > 20 ? `${searchBy.label.substring(0, 20)}...` : searchBy.label}
                            <Icon name="chevronDown" className="h-3 w-3" />
                        </button>

                        {searchDropdownOpen && (
                            <div className="custom-scrollbar absolute right-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                                {searchOptions.map((opt) => {
                                    const displayText = opt.label.length > 20 ? `${opt.label.substring(0, 20)}...` : opt.label;
                                    return (
                                        <button
                                            key={opt.label}
                                            onClick={() => { setSearchBy(opt); closeAllDropdowns(); }}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF] hover:text-[#3B82F6]"
                                            title={opt.label}
                                        >
                                            {opt.iconText ? (
                                                <span className="font-black text-slate-400">{opt.iconText}</span>
                                            ) : (
                                                <Icon name={opt.iconName} className="h-3.5 w-3.5 text-slate-400" />
                                            )}
                                            {displayText}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="relative flex flex-1 items-center px-3">
                        <input
                            className="h-full w-full bg-transparent py-2 pl-8 pr-1 text-[12px] font-semibold text-slate-700 focus:outline-none placeholder:text-[#93C5FD]"
                            placeholder={`חפש על ידי ${searchBy.label}...`}
                        />
                        <Icon name="search" className="absolute left-3 h-4 w-4 text-[#3B82F6]" />
                    </div>
                </div>

                <div className="flex shrink-0 gap-3">
                    <div className="relative">
                        <button onClick={() => { closeAllDropdowns(); setSortDropdownOpen(!sortDropdownOpen); }} className={toolbarButton}>
                            <Icon name="arrowDownUp" className="h-3.5 w-3.5 text-[#3B82F6]" />
                            {sortBy}
                            <Icon name="chevronDown" className="h-3 w-3 text-[#3B82F6]" />
                        </button>
                        {sortDropdownOpen && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                                {sortOptions.map((opt, idx) => (
                                    <button
                                        key={`${opt.label}-${idx}`}
                                        onClick={() => { setSortBy(opt.sortType ? `${opt.label} ${opt.sortType === 'up' ? '↑' : '↓'}` : opt.label); closeAllDropdowns(); }}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF] hover:text-[#3B82F6]"
                                    >
                                        <Icon name={opt.iconName} className="h-3.5 w-3.5 text-slate-400" />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button onClick={() => { closeAllDropdowns(); setPriorityDropdownOpen(!priorityDropdownOpen); }} className={toolbarButton}>
                            <Icon name="filter" className="h-3.5 w-3.5 text-[#3B82F6]" />
                            {priorityFilter}
                            <Icon name="chevronDown" className="h-3 w-3 text-[#3B82F6]" />
                        </button>
                        {priorityDropdownOpen && (
                            <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-[#C9E1FF] bg-white py-1 shadow-xl">
                                {priorityOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => { setPriorityFilter(opt); closeAllDropdowns(); }}
                                        className="w-full px-4 py-2 text-right text-xs font-bold text-slate-700 hover:bg-[#EAF4FF] hover:text-[#3B82F6]"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {items.length > 0 ? items.map((task) => (
                    <InquiryListRow
                        key={`${toggleState}-${task.id}`}
                        ticket={task}
                        viewType={viewType}
                        toggleState={toggleState}
                        onView={setSelectedTicket}
                    />
                )) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#C9E1FF] bg-white/70 text-slate-400">
                        <Icon name="filePlus" className="mb-2 h-10 w-10" />
                        <p className="text-sm font-bold">אין נתונים להצגה</p>
                    </div>
                )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-center gap-3 border-t border-[#C9E1FF]/70 pt-3">
                <button className="rounded-lg border border-[#C9E1FF] bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-[0_3px_10px_rgba(37,99,235,0.08)] transition hover:bg-[#EAF4FF] hover:text-[#3B82F6]">
                    הבא &lt;
                </button>
                <div className="rounded-lg border border-[#C9E1FF] bg-[#EAF4FF] px-8 py-1.5 text-xs font-bold text-[#3B82F6] shadow-[0_3px_10px_rgba(37,99,235,0.08)]">
                    עמוד 1 מתוך 4
                </div>
                <button className="rounded-lg border border-[#C9E1FF] bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-[0_3px_10px_rgba(37,99,235,0.08)] transition hover:bg-[#EAF4FF] hover:text-[#3B82F6]">
                    &gt; קודם
                </button>
            </div>

            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    viewType={viewType}
                    transferContext={toggleState}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </div>
    );
};

export default TicketListPage;
