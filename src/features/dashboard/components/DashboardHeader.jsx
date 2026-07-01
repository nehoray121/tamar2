import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="flex h-[78px] shrink-0 items-center justify-between px-6 py-3">
        <div className="flex items-start gap-3 text-right">
            <div className="mt-1 rounded-xl bg-blue-50 p-2 text-blue-500">
                <Icon name="dashboard" className="h-4 w-4" />
            </div>
            <div>
                <h1 className="text-[26px] font-black leading-8 tracking-tight text-slate-950">דשבורד פניות</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">מבט ניהולי כולל</p>
            </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm shadow-sm">
            <span className="font-medium text-slate-500">סה״כ פניות:</span>
            <span className="font-bold text-[#3B82F6]">{totalInquiries}</span>
        </div>
    </header>
);

export default DashboardHeader;
