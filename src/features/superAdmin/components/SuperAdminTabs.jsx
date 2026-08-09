import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { SUPER_ADMIN_TABS } from '../constants.js';

const SuperAdminTabs = ({ activeTab, onTabChange }) => (
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] px-4" aria-label="טאבי מרכז שליטה">
        {SUPER_ADMIN_TABS.map((tab) => (
            <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-[12px] font-black transition ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
        ))}
    </nav>
);

export default SuperAdminTabs;
