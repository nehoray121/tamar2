import React from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Badge, Button } from '../../components/ui/index.js';
import { useRoomHierarchy } from '../../features/rooms/hooks/useRoomHierarchy.js';
import CreateItemModal from './CreateItemModal.jsx';

        const HierarchyPage = ({ onOpenEnvModal, onOpenUserManagement, onRoomSelect }) => {
            const { level, setLevel, showCreateModal, setShowCreateModal, subEnvs, roomsList } = useRoomHierarchy();

            return (
                <div className="h-full flex flex-col bg-brand-bg relative overflow-hidden">
                    {/* Top Blue Banner */}
                    <div className="bg-[#5B8FD4] rounded-b-[40px] pt-10 pb-16 px-12 text-center relative shrink-0 shadow-sm overflow-hidden z-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-10 w-40 h-40 bg-[#1E3A8A]/20 rounded-full blur-2xl transform -translate-y-1/2"></div>
                        
                        <h1 className="text-4xl font-black text-[#1E3A8A] tracking-tight relative z-10">ברוכים הבאים לתפעול מערכות רישתיות</h1>
                        
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-2xl shadow-md border border-gray-100 z-20">
                            <div className="bg-blue-50 text-[#1E4DB7] p-2 rounded-xl">
                                <Icon name="target" className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    {/* Content Layout */}
                    <div className="flex-1 flex gap-8 p-8 mt-4 min-h-0 overflow-hidden">
                        
                        {/* Right Panel (Info & Actions) - First in RTL */}
                        <div className="w-[32%] shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                            {/* Action Buttons Top Right */}
                            {level === 'sub_envs' ? (
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => setShowCreateModal('sub_env')}
                                        className="self-start text-[#1E4DB7] bg-white border border-[#1E4DB7] px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="plus" className="w-4 h-4" /> יצירת תת-סביבה
                                    </button>
                                    <div className="bg-[#1E3A8A] text-white rounded-xl px-5 py-4 shadow-md w-full">
                                        <h3 className="font-extrabold text-sm mb-1">יעילות ופרודוקטיביות</h3>
                                        <p className="text-xs text-blue-200 opacity-80">מערכת מתקדמת לניהול רשתי</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setLevel('sub_envs')}
                                        className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="arrowRight" className="w-4 h-4" /> חזור לתתי-סביבות
                                    </button>
                                    <button 
                                        onClick={onOpenUserManagement}
                                        className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="users" className="w-4 h-4" /> ניהול משתמשים
                                    </button>
                                    <button 
                                        onClick={() => setShowCreateModal('room')}
                                        className="text-white bg-[#1E4DB7] border border-transparent px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-800 transition flex items-center gap-2"
                                    >
                                        <Icon name="plus" className="w-4 h-4" /> יצירת חדר
                                    </button>
                                </div>
                            )}

                            {/* Informational Text */}
                            <div className="mt-4">
                                <h2 className="text-2xl font-black text-[#1E3A8A] mb-3 leading-tight">
                                    {level === 'sub_envs' ? 'הסביבות הפתוחות עבורך' : 'החדרים הזמינים עבורך'}
                                </h2>
                                <p className="text-sm font-semibold text-[#1E4DB7] mb-8 leading-relaxed pr-1">
                                    מערכת מבצעית לניהול פניות, משימות וחדרים. כיוון דיגיטלי שמרכז את כל הפעילות במקום אחד.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">1</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">יומן מבצעי</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">תצוגה חיה של המצב בשטח. כל פנייה נכנסת מתועדת. ניתן לעקוב אחר הסטטוס שלה, המערכת מאפשרת מעקב רציף אחר כל תקלה.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">2</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">ניהול חדרים וסביבות</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">כל חדר מייצג צוות. לאחר בחירת חדר, ניתן לצפות, לפתוח, לסגור ולהעביר פניות בין חדרים. בנוסף קיימת אופציה לשייך משימות לבעלי תפקידים רלוונטים.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">3</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">הגדרות מתקדמות</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">בחדר ניתן לבצע התאמה של שדות, צורת ניהול, תהליכים ותבניות לפי סוג הפעילות הרצויה, תוך כדי שמירה על סדר וסטנדרטיזציה בין פניות דומות.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Left Panel (Grid) - Second in RTL */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-3xl border border-gray-200/60 shadow-inner p-6 backdrop-blur-sm relative">
                            
                            {/* Grid Header Actions */}
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <button 
                                    onClick={onOpenEnvModal}
                                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                >
                                    <Icon name="arrowDownUp" className="w-3.5 h-3.5 text-[#1E4DB7]" /> החלף סביבה
                                </button>
                                
                                {level === 'sub_envs' ? (
                                    <button className="bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2">
                                        גלול מטה לשאר הסביבות <Icon name="chevronDown" className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <div className="bg-white border border-blue-200 text-[#1E4DB7] px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                                        החדרים פעילים ומוכנים <Icon name="check" className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            {/* Cards Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div className="grid grid-cols-2 gap-5">
                                    {(level === 'sub_envs' ? subEnvs : roomsList).map(item => (
                                        <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col relative group">
                                            <div className="flex justify-between items-start mb-6">
                                                <Badge type="active">פעילה</Badge>
                                                <Icon name="globe" className="w-5 h-5 text-[#1E3A8A]" />
                                            </div>
                                            <h3 className="text-center font-black text-gray-800 text-lg mb-6">{item.name}</h3>
                                            <button 
                                                onClick={() => {
                                                    if (level === 'sub_envs') {
                                                        setLevel('rooms');
                                                    } else {
                                                        // פתיחת חדר (מעבר לדשבורד/מערכת פנימית)
                                                        onRoomSelect(item);
                                                    }
                                                }}
                                                className="mt-auto w-full bg-gray-50 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1E4DB7] hover:text-white hover:border-transparent transition-colors shadow-sm"
                                            >
                                                {level === 'sub_envs' ? 'פתח תת-סביבה' : 'פתח חדר'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* מודאל ליצירת תת-סביבה/חדר חדש */}
                    {showCreateModal && (
                        <CreateItemModal 
                            type={showCreateModal} 
                            onClose={() => setShowCreateModal(null)} 
                            onSave={() => console.log('Saved!')} 
                        />
                    )}
                </div>
            );
        };



export default HierarchyPage;
