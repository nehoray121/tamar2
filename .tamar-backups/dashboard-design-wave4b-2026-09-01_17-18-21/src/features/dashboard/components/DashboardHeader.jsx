import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="dashboard-header-v4a">
        <div className="dashboard-header-v4a__text">
            <span className="dashboard-header-v4a__icon">
                <Icon name="dashboard" className="h-[17px] w-[17px]" />
            </span>

            <div className="min-w-0">
                <h1 className="dashboard-header-v4a__title">דשבורד פניות</h1>
                <p className="dashboard-header-v4a__subtitle">מבט ניהולי כולל</p>
            </div>
        </div>

        <div className="dashboard-header-v4a__meta">
            <span>סה״כ פניות</span>
            <strong>{totalInquiries}</strong>
        </div>
    </header>
);

export default DashboardHeader;
