import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="h-[64px] px-6 flex justify-between items-center shrink-0 bg-white/50 border-b border-slate-100">
        <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                <Icon name="dashboard" className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">דשבורד פניות</h1>
            <span className="text-slate-300 font-light">|</span>
            <p className="text-slate-500 text-xs">מבט ניהולי כולל</p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm text-sm">
            <span className="text-slate-500 font-medium">סה״כ פניות:</span>
            <span className="font-bold text-[#3B82F6]">{totalInquiries}</span>
        </div>
    </header>
);

export default DashboardHeader;
