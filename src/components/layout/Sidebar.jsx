import React from 'react';
import Icon from '../common/Icon.jsx';
import ThemeControl from '../../features/theme/ThemeControl.jsx';

        const SidebarNavItem = ({ icon, label, isActive, badge, onClick }) => (
            <button
                type="button"
                onClick={onClick}
                className="my-1 flex w-full items-center justify-between rounded-xl border-r-4 px-4 py-3 text-sm transition-all duration-200 hover:bg-[#F8FAFC]"
                style={{
                    borderRightColor: isActive ? 'var(--color-primary)' : 'transparent',
                    backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: isActive ? 700 : 500
                }}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <Icon name={icon} className="h-5 w-5 shrink-0" color={isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span className="truncate">{label}</span>
                </div>
                {badge && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-600">
                        {badge}
                    </span>
                )}
            </button>
        );

const Sidebar = ({ currentView, navItems, onNavigate }) => (
    <aside className="fixed inset-y-0 right-0 z-30 flex h-screen w-64 flex-col bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.025)]">
            <div className="mx-6 flex h-24 shrink-0 items-center justify-center gap-2 border-b border-slate-100">
                <Icon name="layers" className="h-8 w-8 text-[#1B2559]" />
                <button type="button" className="text-3xl font-extrabold tracking-tight text-[#1B2559]" onClick={() => onNavigate('dashboard')}>
                    תמ״ר
                </button>
            </div>

        <nav className="flex-1 min-h-0 px-4 py-3">
            {navItems.map((item) => (
                <SidebarNavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    isActive={currentView === item.id}
                    onClick={() => onNavigate(item.id)}
                />
            ))}
        </nav>

            <div className="relative mt-auto shrink-0 border-t border-slate-100 px-6 py-5 transition-colors hover:bg-slate-50/60">
                <ThemeControl />
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                        ע
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#1B2559]">עטיה נהוראי</div>
                        <div className="text-xs text-gray-400">14 ביוני 2026</div>
                    </div>
                </div>
            </div>
    </aside>
);

export default Sidebar;
