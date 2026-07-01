import React, { useState } from 'react';
import { Button, Input } from '../../components/ui/index.js';

        const CreateItemModal = ({ type, onClose, onSave }) => {
            const title = type === 'sub_env' ? 'יצירת תת סביבה' : 'יצירת חדר חדש';
            const placeholder1 = type === 'sub_env' ? 'שם התת סביבה' : 'שם החדר';
            const placeholder2 = 'תיאור קצר (אופציונלי)';

            return (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 glass-modal animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-black text-[#1E3A8A]">{title}</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 p-1.5 rounded-lg transition-colors shadow-sm">
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 flex flex-col gap-4">
                            <Input label={<span className="text-gray-700 font-bold">{placeholder1} <span className="text-red-500">*</span></span>} placeholder={`הכנס ${placeholder1}...`} containerClassName="mb-0" className="h-11 text-sm" />
                            <div className="flex flex-col">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">{placeholder2}</label>
                                <textarea className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-brand-mainBlue transition-all shadow-sm resize-none h-24" placeholder="הקלידו כאן..."></textarea>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                            <Button variant="ghost" onClick={onClose} className="px-6 text-xs font-bold">ביטול</Button>
                            <Button onClick={() => { onSave(); onClose(); }} className="px-8 text-xs font-bold">שמור וצור</Button>
                        </div>
                    </div>
                </div>
            );
        };



export default CreateItemModal;
