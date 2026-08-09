import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const ScopeSelect = ({ label, value, onChange, options, disabled = false }) => (
    <label className="min-w-[140px] flex-1 text-[11px] font-black text-[var(--color-text-muted)] sm:flex-none">
        {label}
        <select
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className="mt-0.5 h-8 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 text-[12px] font-bold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] disabled:opacity-50"
        >
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
    </label>
);

const OrganizationalScopeSelector = ({ scope, setScope, resetScope, options }) => {
    const environmentOptions = [{ value: '', label: 'כל המערכת' }, ...options.environments.map((item) => ({ value: item.id, label: item.name }))];
    const subOptions = [{ value: '', label: 'כל תתי-הסביבות' }, ...options.subEnvironments.map((item) => ({ value: item.id, label: item.name }))];
    const roomOptions = [{ value: '', label: 'כל החדרים' }, ...options.rooms.map((item) => ({ value: item.id, label: item.name }))];

    return (
        <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-[var(--color-border)] px-4 py-2">
            <div className="ml-2 flex h-8 items-center gap-2 text-[12px] font-black text-[var(--color-text-secondary)]">
                <Icon name="filter" className="h-4 w-4 text-[var(--color-primary)]" />
                סינון ארגוני:
            </div>
            <ScopeSelect
                label="מערכת"
                value={scope.environmentId || ''}
                options={environmentOptions}
                onChange={(environmentId) => setScope({ environmentId, subEnvironmentId: '', roomId: '' })}
            />
            <ScopeSelect
                label="תת-סביבה"
                value={scope.subEnvironmentId || ''}
                options={subOptions}
                disabled={!scope.environmentId}
                onChange={(subEnvironmentId) => setScope({ subEnvironmentId, roomId: '' })}
            />
            <ScopeSelect
                label="חדר"
                value={scope.roomId || ''}
                options={roomOptions}
                disabled={!scope.environmentId}
                onChange={(roomId) => setScope({ roomId })}
            />
            <button type="button" onClick={resetScope} className="inquiry-control h-8 rounded-lg px-3 text-[12px] font-black">
                איפוס לכל המערכת
            </button>
        </div>
    );
};

export default OrganizationalScopeSelector;
