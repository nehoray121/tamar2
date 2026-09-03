import React, { useEffect, useMemo, useState } from 'react';
import { superAdminService } from '../../features/superAdmin/services/superAdminService.js';
import { useSuperAdminScope } from '../../features/superAdmin/hooks/useSuperAdminScope.js';
import SuperAdminHeader from '../../features/superAdmin/components/SuperAdminHeader.jsx';
import SuperAdminTabs from '../../features/superAdmin/components/SuperAdminTabs.jsx';
import OrganizationalScopeSelector from '../../features/superAdmin/components/OrganizationalScopeSelector.jsx';
import OverviewTab from '../../features/superAdmin/components/OverviewTab.jsx';
import PerformanceTab from '../../features/superAdmin/components/PerformanceTab.jsx';
import OrganizationTab from '../../features/superAdmin/components/OrganizationTab.jsx';
import UsersPermissionsTab from '../../features/superAdmin/components/UsersPermissionsTab.jsx';
import SystemControlTab from '../../features/superAdmin/components/SystemControlTab.jsx';
import ChangeLogTab from '../../features/superAdmin/components/ChangeLogTab.jsx';
import { subscribeSystemRealtime } from '../../features/tickets/boards/realtime/boardSocket.js';

const DEFAULT_TREND_FILTER = {
    preset: '14d',
    appliedPreset: '14d',
    customRange: { from: '', to: '' },
    appliedCustomRange: null,
    validation: ''
};

const validateCustomRange = (customRange, maxDate) => {
    const { from, to } = customRange;
    if (!from || !to) {
        return 'יש לבחור תאריך התחלה ותאריך סיום.';
    }

    if (to < from) {
        return 'תאריך הסיום לא יכול להיות מוקדם מתאריך ההתחלה.';
    }

    if (maxDate && (from > maxDate || to > maxDate)) {
        return 'לא ניתן לבחור תאריך עתידי בטווח זה.';
    }

    return '';
};

const renderActiveTab = (activeTab, data, setActiveTab, overviewProps, onRefresh) => {
    switch (activeTab) {
        case 'operations':
            return <PerformanceTab data={data} />;
        case 'organization':
            return <OrganizationTab data={data} onRefresh={onRefresh} />;
        case 'users':
            return <UsersPermissionsTab data={data} onRefresh={onRefresh} />;
        case 'control':
            return <SystemControlTab data={data} />;
        case 'audit':
            return <ChangeLogTab data={data} />;
        case 'overview':
        default:
            return <OverviewTab data={data} onOpenAttention={() => setActiveTab('control')} {...overviewProps} />;
    }
};

const SuperAdminPage = () => {
    const { activeTab, setActiveTab, scope, setScope, resetScope } = useSuperAdminScope();
    const [trendFilter, setTrendFilter] = useState(DEFAULT_TREND_FILTER);
    const [runtime, setRuntime] = useState({ status: 'loading', data: null, error: '' });
    const [refreshRevision, setRefreshRevision] = useState(0);

    const appliedTrendFilter = useMemo(() => ({
        preset: trendFilter.appliedPreset,
        customRange: trendFilter.appliedCustomRange
    }), [trendFilter.appliedCustomRange, trendFilter.appliedPreset]);
    useEffect(() => {
        const controller = new AbortController();
        setRuntime((current) => ({ ...current, status: current.data ? 'refreshing' : 'loading', error: '' }));
        superAdminService.getAnalytics(scope, appliedTrendFilter, { signal: controller.signal })
            .then((data) => setRuntime({ status: 'ready', data, error: '' }))
            .catch((error) => {
                if (error?.name !== 'AbortError') setRuntime((current) => ({ ...current, status: 'error', error: error?.message || 'לא ניתן לטעון את מרכז השליטה.' }));
            });
        return () => controller.abort();
    }, [scope.environmentId, scope.subEnvironmentId, scope.roomId, appliedTrendFilter, refreshRevision]);
    useEffect(() => subscribeSystemRealtime({
    onInvalidate: () => setRefreshRevision((value) => value + 1)
}), []);

const data = runtime.data;
    const options = useMemo(() => superAdminService.getScopeOptions(scope, data?.organization), [scope, data?.organization]);

    const handleTrendPresetChange = (preset) => {
        if (preset === 'custom') {
            setTrendFilter((current) => ({
                ...current,
                preset,
                validation: ''
            }));
            return;
        }

        setTrendFilter((current) => ({
            ...current,
            preset,
            appliedPreset: preset,
            appliedCustomRange: null,
            validation: ''
        }));
    };

    const handleTrendCustomRangeChange = (field, value) => {
        setTrendFilter((current) => ({
            ...current,
            customRange: {
                ...current.customRange,
                [field]: value
            },
            validation: ''
        }));
    };

    const handleTrendApply = () => {
        const validation = validateCustomRange(trendFilter.customRange, data?.overview?.trendBounds?.maxDate);
        if (validation) {
            setTrendFilter((current) => ({
                ...current,
                validation
            }));
            return;
        }

        setTrendFilter((current) => ({
            ...current,
            preset: 'custom',
            appliedPreset: 'custom',
            appliedCustomRange: { ...current.customRange },
            validation: ''
        }));
    };

    const handleTrendReset = () => {
        setTrendFilter(DEFAULT_TREND_FILTER);
    };

    const overviewProps = {
        trendFilter,
        trendBounds: data?.overview?.trendBounds,
        onTrendPresetChange: handleTrendPresetChange,
        onTrendCustomRangeChange: handleTrendCustomRangeChange,
        onTrendApply: handleTrendApply,
        onTrendReset: handleTrendReset
    };

    if (!data && runtime.status === 'loading') {
        return <div dir="rtl" className="inquiry-page-surface flex h-full items-center justify-center text-sm font-black text-[var(--color-text-secondary)]">טוען נתוני מרכז שליטה...</div>;
    }
    if (!data && runtime.status === 'error') {
        return <div dir="rtl" className="inquiry-page-surface flex h-full items-center justify-center p-6"><div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-6 text-center"><h2 className="font-black text-[var(--color-text-primary)]">לא ניתן לטעון את מרכז השליטה</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{runtime.error}</p></div></div>;
    }
    return (
        <div className="inquiry-page-surface flex h-full min-h-0 flex-col overflow-hidden" dir="rtl">
            <SuperAdminHeader scopeLabel={data.scopeLabel} />
            <SuperAdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <OrganizationalScopeSelector scope={scope} setScope={setScope} resetScope={resetScope} options={options} />
            <main className="min-h-0 flex-1 overflow-hidden p-2.5">
                {renderActiveTab(activeTab, data, setActiveTab, overviewProps, () => setRefreshRevision((value) => value + 1))}
            </main>
        </div>
    );
};

export default SuperAdminPage;
