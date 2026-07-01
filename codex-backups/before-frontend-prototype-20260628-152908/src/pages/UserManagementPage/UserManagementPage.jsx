import React from 'react';
import Icon from '../../components/common/Icon.jsx';

        const UserManagementPage = () => {
            const users = [
                { name: 'עטיה נהוראי', id: 'c9812512', role: 'מתכנת' },
                { name: 'משה כהן', id: 's8624034', role: 'קמ"ד דיגיטל' },
                { name: 'גל אילוז', id: 's7646130', role: 'רמ"ד לוחמה דיגיטל' },
                { name: 'בר עילאי סופר', id: 's8762961', role: 'מתכנת' },
                { name: 'יונתן יוסים', id: 's9267560', role: 'מתכנת' },
                { name: 'סוניה טופיקוב', id: 's9249530', role: 'קלדנית' },
                { name: 'יעקב-קו גלאם', id: 's7524855', role: 'מתכנת' }
            ];

            return (
                <div className="h-full flex flex-col p-8 wave-bg min-h-0">
                    <div className="mb-8 shrink-0 border-b border-gray-200 pb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">ניהול משתמשי הסביבה</h1>
                            <p className="text-sm font-bold text-[#1E4DB7]">כאן ניתן ליצור משתמש ולערוך הרשאות של משתמשים קיימים</p>
                        </div>
                        
                        <div className="w-[400px] relative">
                            <input 
                                className="w-full bg-white border border-gray-200 rounded-full py-2.5 px-5 pr-10 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-bold text-gray-700 placeholder-gray-400" 
                                placeholder="חיפוש לפי שם או מספר אישי" 
                            />
                            <Icon name="search" className="w-4 h-4 absolute right-4 top-3 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                        <div className="grid grid-cols-4 gap-6">
                            {/* Create New User Card */}
                            <div className="bg-transparent border-2 border-dashed border-[#CBD5E1] rounded-3xl p-6 flex flex-col items-center justify-center min-h-[220px] cursor-pointer hover:bg-white hover:border-[#1E4DB7] transition-all group shadow-sm">
                                <div className="w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center mb-4 group-hover:border-[#1E4DB7] group-hover:bg-blue-50 transition-colors bg-white shadow-sm">
                                    <Icon name="plus" className="w-6 h-6 text-gray-500 group-hover:text-[#1E4DB7]" />
                                </div>
                                <h3 className="font-extrabold text-gray-800 text-lg mb-1 group-hover:text-[#1E4DB7]">צור משתמש חדש</h3>
                                <p className="text-xs text-gray-500 font-bold">לחץ על מנת לעבור לדף יצירה</p>
                            </div>

                            {/* Existing Users */}
                            {users.map((u, i) => (
                                <div key={i} className="bg-white/80 border border-gray-200 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[220px] shadow-sm hover:shadow-md hover:border-[#1E4DB7] transition-all">
                                    <div className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center mb-3 shadow-sm text-gray-400">
                                        <Icon name="user" className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-extrabold text-gray-800 text-[15px]">{u.name}</h3>
                                    <div className="flex items-center gap-1.5 text-[#1E4DB7] text-[11px] font-bold mt-1.5 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        <span dir="ltr">{u.id}</span>
                                        <span className="text-[#1E4DB7]">#</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold mt-2.5">
                                        <Icon name="building" className="w-3.5 h-3.5 text-[#1E4DB7]" />
                                        {u.role}
                                    </div>
                                    <button className="mt-5 bg-[#1E4DB7] text-white px-8 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-800 transition shadow-sm">
                                        ערוך
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center items-center gap-4 shrink-0">
                         <button className="bg-white border border-gray-200 text-gray-600 px-5 py-2 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-[#1E4DB7] transition flex items-center gap-1">
                             הבא &lt;
                         </button>
                         <div className="bg-blue-50 border border-blue-200 text-[#1E4DB7] px-8 py-1.5 rounded-xl shadow-sm text-xs font-bold flex flex-col items-center">
                             <span>עמוד 1 מתוך 13</span>
                             <span className="text-[9px] font-semibold opacity-80 mt-0.5 text-gray-600">מציג 8 מתוך 98 משתמשים</span>
                         </div>
                         <button className="bg-white border border-gray-100 text-gray-400 px-5 py-2 rounded-lg shadow-sm text-xs font-bold cursor-not-allowed flex items-center gap-1">
                             &gt; קודם
                         </button>
                    </div>
                </div>
            );
        };



export default UserManagementPage;
