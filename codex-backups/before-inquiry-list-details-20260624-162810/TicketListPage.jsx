import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Badge } from '../../components/ui/index.js';
import TicketModal from './TicketModal.jsx';
import { mockTasks } from '../../features/tickets/data/tickets.mock.js';

        const TicketListPage = ({ title, description, showToggle = false, isExternal = false, viewType = 'default' }) => {
            const [toggleState, setToggleState] = useState('received'); // 'received' or 'sent'
            const [selectedTicket, setSelectedTicket] = useState(null); // ׳ ׳™׳”׳•׳ ׳”׳₪׳•׳₪-׳׳₪
            
            // Advanced Filters State
            const [searchBy, setSearchBy] = useState({ label: 'מספר פניה', iconText: '#' });
            const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
            
            const [sortBy, setSortBy] = useState('מספר פנייה ↑↓');
            const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
            
            const [priorityFilter, setPriorityFilter] = useState('בחר דחיפות');
            const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

            // Filter Options
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
                <div className="p-5 h-full flex flex-col wave-bg min-h-0 relative">
                    
                    {/* Global overlay to close dropdowns */}
                    {(searchDropdownOpen || sortDropdownOpen || priorityDropdownOpen) && (
                        <div className="fixed inset-0 z-30" onClick={closeAllDropdowns}></div>
                    )}

                    <div className="mb-5 shrink-0 relative z-10">
                        <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">{title}</h1>
                        <p className="text-sm font-semibold text-[#1E4DB7]">{description}</p>
                        
                        {showToggle && (
                            <div className="absolute top-0 left-0 bg-[#E5E7EB] p-1 rounded-full flex relative shadow-inner w-[240px]">
                                <div 
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out"
                                    style={{
                                        transform: toggleState === 'received' ? 'translateX(0)' : 'translateX(-100%)',
                                        right: '4px'
                                    }}
                                ></div>
                                
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

                    <div className="flex justify-between items-center mb-3 gap-4 shrink-0 relative z-40">
                        {/* RIGHT SIDE: Search Input + Dropdown */}
                        <div className="flex-1 flex bg-white border border-gray-200 shadow-sm rounded-lg max-w-xl relative transition-colors focus-within:border-[#1E4DB7]">
                            <div className="relative border-l border-gray-200">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setSearchDropdownOpen(!searchDropdownOpen);}} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-r-lg h-full"
                                    title={searchBy.label}
                                >
                                    {searchBy.iconText ? (
                                        <span className="text-[#1E4DB7] bg-blue-50 px-1 py-0.5 rounded text-[11px] leading-none">{searchBy.iconText}</span>
                                    ) : (
                                        <Icon name={searchBy.iconName} className="w-3.5 h-3.5 text-[#1E4DB7]" />
                                    )}
                                    {searchBy.label.length > 20 ? searchBy.label.substring(0, 20) + '...' : searchBy.label}
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                
                                {searchDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {searchOptions.map(opt => {
                                            const displayText = opt.label.length > 20 ? opt.label.substring(0, 20) + '...' : opt.label;
                                            return (
                                                <button 
                                                    key={opt.label} 
                                                    onClick={() => { setSearchBy(opt); closeAllDropdowns(); }} 
                                                    className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7] flex items-center gap-2"
                                                    title={opt.label}
                                                >
                                                    {opt.iconText ? (
                                                        <span className="text-gray-400 font-black">{opt.iconText}</span>
                                                    ) : (
                                                        <Icon name={opt.iconName} className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                    {displayText}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 relative">
                                <input 
                                    className="w-full h-full bg-transparent py-2 px-3 pl-8 text-sm focus:outline-none text-gray-700 font-semibold" 
                                    placeholder={`חפש על ידי ${searchBy.label}...`} 
                                />
                                <Icon name="search" className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                            </div>
                        </div>
                        
                        {/* LEFT SIDE: Sort & Filter */}
                        <div className="flex gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setSortDropdownOpen(!sortDropdownOpen);}} 
                                    className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-2 text-xs font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors h-full"
                                >
                                    <Icon name="arrowDownUp" className="w-3.5 h-3.5 text-gray-500" />
                                    {sortBy} 
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                {sortDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                        {sortOptions.map((opt, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => { setSortBy(opt.sortType ? `${opt.label} ${opt.sortType==='up'?'↑':'↓'}` : opt.label); closeAllDropdowns(); }} 
                                                className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7] flex items-center gap-2"
                                            >
                                                <Icon name={opt.iconName} className="w-3.5 h-3.5 text-gray-400" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setPriorityDropdownOpen(!priorityDropdownOpen);}} 
                                    className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-2 text-xs font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors h-full"
                                >
                                    <Icon name="filter" className="w-3.5 h-3.5 text-gray-500" />
                                    {priorityFilter} 
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                {priorityDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                        {priorityOptions.map(opt => (
                                            <button 
                                                key={opt} 
                                                onClick={() => { setPriorityFilter(opt); closeAllDropdowns(); }} 
                                                className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7]"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5">
                        {items.length > 0 ? items.map((task, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center shadow-sm hover:shadow-md transition">
                                <div className="flex items-center gap-3 w-56 pr-1 shrink-0">
                                    <div className="bg-[#EFF6FF] text-brand-mainBlue p-1.5 rounded-lg font-extrabold flex items-center justify-center w-7 h-7 shrink-0">
                                        <span className="text-xs">#</span>
                                    </div>
                                    <span className="font-bold text-gray-800 text-xs truncate w-24">{task.id}</span>
                                    <Badge type={task.priority.includes('נמוכה') ? 'low' : 'high'}>{task.priority}</Badge>
                                </div>
                                <div className="flex items-center justify-between flex-1 text-[11px] font-bold text-gray-600 px-4">
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="user" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="location" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.room}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="phone" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="calendar" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="whitespace-nowrap">{task.date}</span>
                                    </div>
                                </div>
                                
                                <div className="pl-1 shrink-0 flex items-center gap-2">
                                    {viewType === 'open' && (
                                        <button className="bg-green-500 text-white p-2 rounded-lg shadow-sm hover:bg-green-600 transition" title="סגור פנייה">
                                            <Icon name="check" className="w-4 h-4" />
                                        </button>
                                    )}
                                    {viewType === 'external' && toggleState === 'received' && (
                                        <React.Fragment>
                                            <button className="bg-red-500 text-white p-2 rounded-lg shadow-sm hover:bg-red-600 transition" title="דחה פנייה">
                                                <Icon name="close" className="w-4 h-4" />
                                            </button>
                                            <button className="bg-green-500 text-white p-2 rounded-lg shadow-sm hover:bg-green-600 transition" title="קבל פנייה">
                                                <Icon name="check" className="w-4 h-4" />
                                            </button>
                                        </React.Fragment>
                                    )}
                                    {viewType === 'external' && toggleState === 'sent' && (
                                        <button className="bg-red-500 text-white p-2 rounded-lg shadow-sm hover:bg-red-600 transition" title="בטל פנייה">
                                            <Icon name="close" className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedTicket(task)}
                                        className="bg-[#1E3A8A] text-white p-2 rounded-lg shadow-sm hover:bg-blue-800 transition" 
                                        title="צפה בפנייה"
                                    >
                                        <Icon name="eye" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                                <Icon name="filePlus" className="w-10 h-10 text-gray-400 mb-2" />
                                <p className="text-gray-500 font-bold text-sm">אין נתונים להצגה</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center items-center gap-4 shrink-0">
                         <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-brand-mainBlue transition">
                             הבא &lt;
                         </button>
                         <div className="bg-white border border-gray-200 text-gray-700 px-8 py-1.5 rounded-lg shadow-sm text-xs font-bold">
                             עמוד 1 מתוך 4
                         </div>
                         <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-brand-mainBlue transition">
                             &gt; קודם
                         </button>
                    </div>

                    {selectedTicket && (
                        <TicketModal 
                            ticket={selectedTicket} 
                            viewType={viewType} 
                            onClose={() => setSelectedTicket(null)} 
                        />
                    )}
                </div>
            );
        };



export default TicketListPage;
