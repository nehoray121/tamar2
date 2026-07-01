import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({ fullSectionExpansion, selectedKpis, onEdit }) => (
    <div className={`dashboard-motion overflow-hidden ${fullSectionExpansion ? 'mb-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none' : 'mb-3 max-h-[188px] translate-y-0 opacity-100 shrink-0'}`}>
        <div className="mb-2 flex items-end justify-between px-1">
            <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-5 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-700 hover:text-blue-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
                <Icon name="settings" className="order-last h-3.5 w-3.5 shrink-0" />
                ערוך כרטיסיות
            </button>
        </div>
        <div className="grid h-[clamp(120px,14vh,138px)] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 lg:gap-4">
            {selectedKpis.map((kpi) => <DashboardKpiCard key={kpi.id} {...kpi} />)}
        </div>
    </div>
);

export default DashboardKpiGrid;
