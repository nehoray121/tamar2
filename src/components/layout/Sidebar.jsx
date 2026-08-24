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
        data-active={isActive ? 'true' : 'false'}
        onClick={onClick}
        className="tamar-v22-sidebar-item flex w-full items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
    >
        <span className="flex min-w-0 items-center gap-2.5">
            <Icon
                name={icon}
                className="h-4 w-4 shrink-0"
                color={isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'}
            />
            <span className="truncate">{label}</span>
        </span>
        {badge !== undefined && badge !== null && (
            <span className="tamar-v22-sidebar-badge inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                {badge}
            </span>
        )}
    </button>
);

const SidebarBrand = ({ onNavigate }) => (
    <div className="tamar-v22-sidebar-brand flex shrink-0 items-center gap-2 border-b border-[var(--color-border)]">
        <span className="tamar-v22-sidebar-brand-mark" aria-hidden="true">ת</span>
        {onNavigate ? (
            <button
                type="button"
                className="tamar-v22-sidebar-brand-name"
                onClick={() => onNavigate('dashboard')}
            >
                תמ״ר
            </button>
        ) : (
            <span className="tamar-v22-sidebar-brand-name">תמ״ר</span>
        )}
    </div>
);

const SidebarSection = ({ label, items, currentView, onNavigate }) => {
    if (!items.length) return null;

    return (
        <section className="tamar-v22-sidebar-section">
            <div className="tamar-v22-sidebar-section-label">{label}</div>
            <div className="space-y-0.5">
                {items.map((item) => (
                    <SidebarNavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        isActive={currentView === item.id}
                        onClick={() => onNavigate(item.id)}
                    />
                ))}
            </div>
        </section>
    );
};

const SidebarFooter = ({ currentUser }) => {
    const displayName = currentUser?.displayName
        || currentUser?.name
        || 'משתמש מערכת';
    const initial = displayName.trim().charAt(0) || 'מ';
    const subtitle = currentUser?.email
        || currentUser?.personalNumberMasked
        || 'משתמש מחובר';

    return (
        <div className="tamar-v22-sidebar-footer relative mt-auto shrink-0 border-t border-[var(--color-border)]">
            <div className="tamar-v22-sidebar-theme-row">
                <span>מצב תצוגה</span>
                <ThemeControl />
            </div>
            <div className="tamar-v22-sidebar-user flex items-center gap-2.5">
                <div className="tamar-v22-sidebar-avatar">
                    {initial}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-[12px] font-bold text-[var(--color-text-primary)]">
                        {displayName}
                    </div>
                    <div className="truncate text-[10px] text-[var(--color-text-muted)]">
                        {subtitle}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SuperAdminSidebarContent = ({ onReturnToEnvironment }) => (
    <nav className="tamar-v22-sidebar-nav flex-1 min-h-0">
        <div className="tamar-v22-sidebar-section-label">ראשי</div>
        <button
            type="button"
            onClick={onReturnToEnvironment}
            data-active="true"
            className="tamar-v22-sidebar-item flex w-full items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
            <Icon name="arrowRight" className="h-4 w-4 shrink-0" />
            <span className="truncate">חזור לסביבה</span>
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
}) => {
    const primaryItems = navItems.filter((item) => item.id !== 'settings');
    const generalItems = navItems.filter((item) => item.id === 'settings');

    return (
        <aside className="tamar-v22-sidebar fixed inset-y-0 right-0 z-30 flex h-screen flex-col text-[var(--color-text-primary)]">
            <SidebarBrand
                onNavigate={variant === 'superAdmin' ? undefined : onNavigate}
            />

            {variant === 'superAdmin' ? (
                <SuperAdminSidebarContent
                    onReturnToEnvironment={onReturnToEnvironment}
                />
            ) : (
                <nav className="tamar-v22-sidebar-nav flex-1 min-h-0 overflow-hidden">
                    <SidebarSection
                        label="ראשי"
                        items={primaryItems}
                        currentView={currentView}
                        onNavigate={onNavigate}
                    />
                    <SidebarSection
                        label="כללי"
                        items={generalItems}
                        currentView={currentView}
                        onNavigate={onNavigate}
                    />
                </nav>
            )}

            <SidebarFooter currentUser={currentUser} />
        </aside>
    );
};

export default Sidebar;
