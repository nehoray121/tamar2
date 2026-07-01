import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Button } from '../../components/ui/index.js';

        const TicketModal = ({ ticket, viewType, onClose }) => {
            const [activeTab, setActiveTab] = useState('info');

            // הגדרת הטאבים הזמינים לפי סוג התצוגה
            let availableTabs = [];
            if (viewType === 'open' || viewType === 'my_tasks') {
                availableTabs = [
                    { id: 'info', label: 'מידע אודות הפנייה' },
                    { id: 'chat', label: "צ'אט" },
                    { id: 'edit', label: 'מצב עריכה' },
                    { id: 'send', label: 'שליחה' },
                    { id: 'close', label: 'סגירת פנייה' }
                ];
            } else if (viewType === 'history') {
                availableTabs = [
                    { id: 'info', label: 'מידע אודות הפנייה' },
                    { id: 'chat', label: "צ'אט" },
                    { id: 'edit', label: 'מצב עריכה' }
                ];
            } else if (viewType === 'external') {
                availableTabs = [
                    { id: 'info', label: 'מידע אודות הפנייה' },
                    { id: 'chat', label: "צ'אט" }
                ];
            }

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
                    
                    <div className="bg-[#F4F5FA] w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-fade-in z-10 border border-gray-200">
                        
                        <div className="px-8 pt-6 pb-0 flex flex-col shrink-0">
                            <div className="flex justify-between items-start w-full">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Icon name="filePlus" className="w-5 h-5 text-[#1E4DB7]" />
                                        <h2 className="text-2xl font-black text-[#1E3A8A] tracking-tight">{ticket.id.replace('...', '')}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                                            {ticket.priority || 'בינונית-2'}
                                        </span>
                                        <span className="bg-[#22C55E] text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                                            {viewType === 'history' ? 'סגורה' : 'פתוחה'}
                                        </span>
                                    </div>
                                </div>

                                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 p-1.5 rounded-lg transition-colors shadow-sm">
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex gap-6 mt-6 border-b border-gray-200">
                                {availableTabs.map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-3 px-1 text-sm font-bold transition-all relative ${
                                            activeTab === tab.id 
                                            ? 'text-[#1E4DB7]' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E4DB7] rounded-t-md"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar relative">
                            {/* --- TAB: INFO (מידע אודות הפנייה) --- */}
                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[#1E3A8A] font-extrabold text-lg mb-4">מידע קריטי</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="user" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">נפתח על ידי</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.name}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="phone" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">טלפון ליצירת קשר</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.phone !== 'לא זמין' ? ticket.phone : '050-1234567'}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="calendar" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">תאריך פתיחה</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.date} בשעה 13:27</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="check" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">תאריך סגירה</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{viewType === 'history' ? `${ticket.date} בשעה 14:00` : 'טרם נסגר'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[#1E3A8A] font-extrabold text-lg mb-4 mt-8">מידע נלווה</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">גורם מטפל</div>
                                                <div className="text-gray-800 font-semibold text-sm">מנדיי (ccfcc)</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">מ.א של לקוח</div>
                                                <div className="text-gray-800 font-semibold text-sm">s3333333</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">אופן טיפול בפנייה</div>
                                                <div className="text-gray-800 font-semibold text-sm">הפנייה טופלה בהצלחה (dsfsdfsd)</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">סוג רשת</div>
                                                <div className="text-gray-800 font-semibold text-sm">סודי</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">מידע יעודי</div>
                                                <div className="text-gray-800 font-semibold text-sm">sdfsdf</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">משימה ייחודית</div>
                                                <div className="text-gray-800 font-semibold text-sm">sdfsdfsd</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: EDIT (מצב עריכה) --- */}
                            {activeTab === 'edit' && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-5">
                                            <Select label="גורם מטפל *" options={["מנדיי (ccfcc)", "אחר"]} className="font-bold text-[#1E4DB7] h-11" />
                                            <Input label="אופן טיפול בפנייה" defaultValue="הפנייה טופלה בהצלחה (dsfsdfsd)" className="h-11 font-bold text-gray-700" />
                                            <Input label="טלפון ליצירת קשר *" icon="phone" defaultValue={ticket.phone !== 'לא זמין' ? ticket.phone : '050-1234567'} className="h-11 font-bold text-[#1E4DB7]" />
                                            <Select label="סוג רשת *" options={["סודי", "בלמ״ס"]} className="font-bold text-[#1E4DB7] h-11" />
                                        </div>
                                        <div className="flex flex-col gap-5">
                                            <Input label="מ.א של לקוח" icon="search" defaultValue="s3333333" className="h-11 font-bold text-[#1E4DB7]" />
                                            <Input label="מידע יעודי" defaultValue="sdfsdf" className="h-11 font-bold text-gray-700" />
                                            <div className="flex flex-col flex-1">
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5">תיאור התקלה *</label>
                                                <textarea className="w-full flex-1 bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-sm font-bold text-gray-700 focus:outline-none focus:border-[#1E4DB7] resize-none" defaultValue="sdfsdfsd"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-gray-200 flex justify-center">
                                        <Button className="px-10 py-2.5 text-sm rounded-xl shadow-md w-full max-w-xs">שמור שינויים</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: CLOSE (סגירת פנייה) --- */}
                            {activeTab === 'close' && (
                                <div className="flex flex-col items-center justify-center py-4 max-w-2xl mx-auto space-y-8 animate-fade-in">
                                    <div className="text-center space-y-1.5 mt-4">
                                        <h3 className="text-[17px] font-bold text-gray-800">האם אתה בטוח שאתה רוצה לסגור את הפנייה?</h3>
                                        <p className="text-[13px] text-gray-400 font-bold">כרגע לא יהיה ניתן לשחזר אותה</p>
                                    </div>
                                    
                                    <div className="w-full flex justify-between bg-[#F8FAFC] border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex flex-col items-start gap-2 w-1/2">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm w-fit">
                                                <Icon name="calendar" className="w-3 h-3 text-[#1E4DB7]" />
                                                תאריך פתיחה של הלקוח
                                            </div>
                                            <span className="font-extrabold text-[#1E3A8A] text-sm ml-1 pr-1">14 ביוני 2026 בשעה 11:45</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 w-1/2 border-r border-gray-200 pr-5">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm w-fit">
                                                מספר פנייה
                                                <span className="text-[#1E4DB7] font-black text-xs leading-none">#</span>
                                            </div>
                                            <span className="font-extrabold text-[#1E3A8A] text-sm mr-1 pl-1" dir="ltr">{ticket.id || 'BC-284-1781426709667'}</span>
                                        </div>
                                    </div>

                                    <div className="w-full">
                                        <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-semibold text-gray-700 placeholder-gray-400" placeholder="הקליד/י כאן את אופן הטיפול בתקלה" />
                                    </div>

                                    <div className="flex items-center justify-center gap-4 pt-2">
                                        <Button className="px-10 py-2.5 text-sm rounded-xl font-bold shadow-md bg-[#1E3A8A] hover:bg-blue-900">כן, סגור פנייה</Button>
                                        <Button variant="ghost" className="px-10 py-2.5 text-sm rounded-xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700" onClick={onClose}>בטל</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: SEND (שליחת פנייה / העברה לחדר) --- */}
                            {activeTab === 'send' && (
                                <div className="space-y-6 animate-fade-in pb-4">
                                    <div className="bg-[#F8FAFC] border border-gray-200 shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3">
                                        <label className="text-[#1E3A8A] font-extrabold text-[15px]">בחרו לאיזה חדר להעביר</label>
                                        <Select options={["מנדיי"]} className="w-72 text-center font-bold text-[#1E4DB7] h-10 shadow-sm border-gray-200" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                                        <div className="flex flex-col gap-6">
                                            <Select label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="users" className="w-3.5 h-3.5 text-[#1E4DB7]"/> גורם מטפל <span className="text-red-500">*</span></span>} options={["מנדיי"]} className="font-bold text-[#1E4DB7] h-11 bg-white" />
                                            <Input label={<span className="text-gray-700 font-bold block">אופן טיפול בפנייה</span>} defaultValue="אופן טיפול בפנייה" className="h-11 font-bold text-gray-500 bg-white" />
                                            <Input label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="location" className="w-3.5 h-3.5 text-gray-400"/> מיקום</span>} defaultValue="בהההה" className="h-11 font-bold text-gray-500 bg-white" />
                                        </div>
                                        <div className="flex flex-col gap-6">
                                            <Select label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="target" className="w-3.5 h-3.5 text-red-500"/> דחיפות <span className="text-red-500">*</span></span>} options={["נמוכה-3"]} className="font-bold text-gray-600 h-11 bg-white" />
                                            <Input label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="user" className="w-3.5 h-3.5 text-[#1E4DB7]"/> מ.א של לקוח <span className="text-red-500">*</span></span>} defaultValue="c6666666" className="h-11 font-extrabold text-[#1E4DB7] bg-white" />
                                            <div className="flex flex-col flex-1">
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5"><Icon name="filePlus" className="w-3.5 h-3.5 text-[#1E4DB7]"/> תיאור התקלה <span className="text-red-500">*</span></label>
                                                <textarea className="w-full flex-1 bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-sm font-extrabold text-[#1E4DB7] focus:outline-none focus:border-[#1E4DB7] resize-none h-24 leading-relaxed" defaultValue="77777777777777"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-2">
                                        <Button className="px-14 py-2.5 text-sm rounded-xl font-bold shadow-md bg-[#1E4DB7] hover:bg-blue-800">שלח פנייה</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: CHAT (Placeholder) --- */}
                            {activeTab === 'chat' && (
                                <div className="h-64 flex flex-col items-center justify-center opacity-60">
                                    <Icon name="chat" className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-400">אזור צ'אט בהקמה</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };



export default TicketModal;
