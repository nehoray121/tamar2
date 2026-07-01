import React from 'react';
import { Button, Input, Select } from '../../../components/ui/index.js';

const RoomFieldsCard = () => (
                    <div className="flex-[1.4] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
                        {/* Header Box */}
                        <div className="px-4 py-1.5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/30">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-lg text-brand-text">שדות חדר</h3>
                                <Select options={["בחירת חדר"]} containerClassName="mb-0" className="w-28 py-1.5 text-xs text-gray-500 font-bold bg-white" />
                            </div>
                            <div className="flex items-center gap-2 flex-nowrap">
                                <Button variant="outline" className="text-[11px] py-1.5 px-3 border-brand-blue text-brand-blue whitespace-nowrap">בצע שיוך אישי</Button>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap border border-gray-300 text-gray-500 text-[10px] font-bold px-3 py-1.5 rounded-md bg-white"><b>0/10</b><span>סה&quot;כ שדות</span></span>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-md"><b>2</b><span>אופציונליים</span></span>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-md"><b>1</b><span>חובה</span></span>
                            </div>
                        </div>
                        
                        {/* Form Fields Grid */}
                        <div className="p-4 flex-1 overflow-hidden min-h-0">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 h-full content-start">
                                {/* Left Side of Room Fields */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 text-right">אופן טיפול בפנייה</label>
                                        <textarea className="w-full h-[48px] min-h-[48px] bg-white border border-gray-200 shadow-sm rounded-lg py-2.5 px-4 text-[13px] focus:outline-none focus:border-brand-blue resize-y leading-5" placeholder="הכנס/י אופן טיפול בפנייה"></textarea>
                                    </div>
                                    <Input label="מיקום" placeholder="הכנס/י מיקום" containerClassName="mb-0" className="text-right h-[48px] px-4 text-[13px]" />
                                </div>
                                {/* Right Side of Room Fields */}
                                <div className="flex flex-col gap-4">
                                    <Input label={<span className="text-red-600 font-bold">גורם מטפל *</span>} placeholder="מנדיי" containerClassName="mb-0" className="text-right font-bold text-gray-800 h-[48px] px-4 text-[13px]" />
                                    <Input label="שיוך אנשים / נציג מטפל" placeholder="בחר משתמש לשיוך..." containerClassName="mb-0" className="text-right h-[48px] px-4 text-[13px]" />
                                </div>
                            </div>
                        </div>
                    </div>
);

export default RoomFieldsCard;
