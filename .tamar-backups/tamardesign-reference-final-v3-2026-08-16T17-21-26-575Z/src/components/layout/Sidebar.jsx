import React from 'react';
import Icon from '../common/Icon.jsx';
import ThemeControl from '../../features/theme/ThemeControl.jsx';

const SidebarNavItem = ({
    icon,
    label,
    isActive,
    badge,
    onClick
}) => (
    <button
        type="button"
        onClick={onClick}
        className="my-1 flex w-full items-center justify-between rounded-xl border-r-4 px-4 py-3 text-sm transition-all duration-200 hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        style={{
            borderRightColor: isActive
                ? 'var(--color-primary)'
                : 'transparent',
            backgroundColor: isActive
                ? 'var(--color-primary-soft)'
                : 'transparent',
            color: isActive
                ? 'var(--color-primary)'
                : 'var(--color-text-muted)',
            fontWeight: isActive ? 700 : 500
        }}
    >
        <div className="flex min-w-0 items-center gap-3">
            <Icon
                name={icon}
                className="h-5 w-5 shrink-0"
                color={
                    isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)'
                }
            />
            <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && badge !== null && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] px-1.5 text-[10px] font-bold text-[var(--color-primary)]">
                {badge}
            </span>
        )}
    </button>
);

const SidebarBrand = ({ onNavigate }) => (
    <div className="mx-6 flex h-24 shrink-0 items-center justify-center gap-2 border-b border-[var(--color-border)]">
        <Icon
            name="layers"
            className="h-8 w-8 text-[var(--color-text-primary)]"
        />
        {onNavigate ? (
            <button
                type="button"
                className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]"
                onClick={() => onNavigate('dashboard')}
            >
                תמ״ר
            </button>
        ) : (
            <span className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                תמ״ר
            </span>
        )}
    </div>
);

const SidebarFooter = ({ currentUser }) => {
    const displayName = currentUser?.displayName
        || currentUser?.name
        || 'משתמש מערכת';
    const initial = displayName.trim().charAt(0) || 'מ';
    const subtitle = currentUser?.email
        || currentUser?.personalNumberMasked
        || 'משתמש מחובר';

    return (
        <div className="relative mt-auto shrink-0 border-t border-[var(--color-border)] px-6 py-5 transition-colors hover:bg-[var(--color-surface-muted)]">
            <ThemeControl />
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-lg font-bold text-[var(--color-primary)]">
                    {initial}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                        {displayName}
                    </div>
                    <div className="truncate text-xs text-[var(--color-text-muted)]">
                        {subtitle}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SuperAdminSidebarContent = ({ onReturnToEnvironment }) => (
    <nav className="flex-1 min-h-0 px-4 py-3">
        <button
            type="button"
            onClick={onReturnToEnvironment}
            className="my-1 flex w-full items-center justify-between rounded-xl border-r-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
            <span className="flex min-w-0 items-center gap-3">
                <Icon
                    name="arrowRight"
                    className="h-5 w-5 shrink-0"
                />
                <span className="truncate">חזור לסביבה</span>
            </span>
        </button>
    </nav>
);

const Sidebar = ({
    currentView,
    navItems,
    onNavigate,
    variant = 'default',
    onReturnToEnvironment,
    currentUser
}) => (
    <aside className="fixed inset-y-0 right-0 z-30 flex h-screen w-64 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] shadow-[-8px_0_30px_rgba(0,0,0,0.025)]">
        <SidebarBrand
            onNavigate={variant === 'superAdmin' ? undefined : onNavigate}
        />

        {variant === 'superAdmin' ? (
            <SuperAdminSidebarContent
                onReturnToEnvironment={onReturnToEnvironment}
            />
        ) : (
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
        )}

        <SidebarFooter currentUser={currentUser} />
    </aside>
);

export default Sidebar;
