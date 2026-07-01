import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Button } from '../../components/ui/index.js';

        const EnvironmentSelectionModal = ({ onConfirm, onClose, isAdmin }) => {
            const [selectedId, setSelectedId] = useState(null);
            
            const envs = [
                { id: 1, name: 'תקשוב', date: '24 ביוני 2026' },
                { id: 2, name: 'ביסלח', date: '24 ביוני 2026' },
                { id: 3, name: 'ג\'ולים', date: '24 ביוני 2026' },
                { id: 4, name: 'שיבטה', date: '24 ביוני 2026' },
                { id: 5, name: 'השתלמות זרוע יבשה', date: '24 ביוני 2026' },
                { id: 6, name: 'מחשוב', date: '24 ביוני 2026' },
            ];

            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 glass-modal animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center justify-center pt-8 pb-4 relative shrink-0">
                            <button onClick={onClose} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 bg-gray-50 border border-gray-100 p-2 rounded-full transition-colors shadow-sm">
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                            <div className="absolute top-6 right-6 text-brand-mainBlue">
                                <Icon name="globe" className="w-6 h-6" />
                            </div>
                            <h2 className="text-[28px] font-black text-[#1E3A8A] tracking-tight">בחירת סביבה</h2>
                            <p className="text-gray-500 font-bold text-sm mt-1">15 סביבות עבודה זמינות</p>
                            
                            <div className="w-full max-w-2xl px-6 mt-6 relative">
                                <input 
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl py-3 px-4 pl-10 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-semibold text-gray-700" 
                                    placeholder="חפש סביבה לפי שם..." 
                                />
                                <Icon name="search" className="w-4 h-4 absolute left-10 top-3.5 text-[#1E4DB7]" />
                            </div>
                        </div>

                        {/* Grid Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                            <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                                {envs.map(env => (
                                    <div 
                                        key={env.id} 
                                        onClick={() => setSelectedId(env.id)}
                                        className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center min-h-[120px] gap-3 relative ${
                                            selectedId === env.id ? 'border-[#1E4DB7] ring-1 ring-[#1E4DB7] bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-[#1E3A8A] font-extrabold text-lg">
                                            {env.name} <Icon name="building" className="w-5 h-5 text-[#1E4DB7]" />
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 absolute bottom-3 left-4">
                                            <Icon name="calendar" className="w-3 h-3" /> {env.date}
                                        </div>
                                    </div>
                                ))}

                                {/* Admin Create Environment Option */}
                                {isAdmin && (
                                    <div className="bg-[#F8FAFC] border-2 border-dashed border-gray-300 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[120px] gap-3">
                                        <input 
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#1E4DB7] text-center font-bold"
                                            placeholder="הכנס שם סביבה..."
                                        />
                                        <Button className="w-full text-xs py-2">יצירת סביבה חדשה</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-gray-100 flex justify-center gap-4 bg-white shrink-0">
                            <Button variant="ghost" onClick={onClose} className="px-8 rounded-xl font-bold">בטל</Button>
                            <Button 
                                onClick={() => selectedId && onConfirm(envs.find(e => e.id === selectedId))} 
                                className={`px-10 rounded-xl font-bold ${!selectedId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!selectedId}
                            >
                                <Icon name="check" className="w-4 h-4" /> אשר מעבר
                            </Button>
                        </div>
                    </div>
                </div>
            );
        };


export default EnvironmentSelectionModal;
