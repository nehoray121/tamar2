import React from 'react';
import { Input } from '../../../components/ui/index.js';

const SystemFieldsCard = () => (
                    <div className="flex-[0.98] max-w-[430px] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
                        <div className="px-4 py-1.5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/30">
                            <div className="flex items-center gap-3 min-w-0">
                                <h3 className="font-bold text-lg text-brand-text whitespace-nowrap">שדות מערכת</h3>
                                <span className="text-[11px] font-bold text-brand-text whitespace-nowrap border-r border-gray-200 pr-3">
                                    פותח פנייה: <span className="font-bold text-gray-800">עטיה נהוראי</span>
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white px-3 py-1.5 rounded-md text-[10px] font-bold"><b>5</b><span>חובה</span></span>
                        </div>
                        <div className="p-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                            <Input label={<span className="text-red-600 font-bold">מספר אישי של הלקוח *</span>} placeholder="הכנס/י מספר אישי של הלקוח" icon="user" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">שם הלקוח *</span>} placeholder="הכנס/י שם הלקוח" icon="user" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">טלפון ליצירת קשר *</span>} placeholder="הכנס/י טלפון ליצירת קשר" icon="phone" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">רמת דחיפות *</span>} placeholder="נמוכה-3" containerClassName="mb-0 shrink-0" className="text-right font-bold h-[40px] px-4 text-[13px]" />
                            
                            <div className="flex-1 min-h-[118px] flex flex-col pt-0">
                                <label className="block text-xs font-bold text-red-600 mb-1 text-right shrink-0">תיאור התקלה *</label>
                                <textarea className="w-full flex-1 min-h-[105px] bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-[13px] focus:outline-none focus:border-brand-blue resize-y leading-5" placeholder="הכנס/י תיאור התקלה"></textarea>
                            </div>
                        </div>
                    </div>
);

export default SystemFieldsCard;
