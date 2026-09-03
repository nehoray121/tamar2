import React from 'react';
import Icon from '../common/TamarIcon.jsx';
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

const SidebarBackAction = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="tamar-sidebar-back-action-v3"
        aria-label="חזרה לבחירת חדרים"
        title="חזרה לבחירת חדרים"
    >
        <Icon
            name="arrowRight"
            className="h-4 w-4 shrink-0"
        />

        <span className="truncate">
            חזרה לחדרים
        </span>
    </button>
);

const Sidebar = ({
    currentView,
    navItems,
    onNavigate,
    variant = 'default',
    onReturnToEnvironment,
    currentUser
}) => {
    const standardNavItems = Array.isArray(navItems)
        ? navItems.filter((item) => item.id !== 'hierarchy')
        : [];

    return (
        <aside className="tamar-v22-sidebar tamar-reference-sidebar fixed inset-y-0 right-0 z-30 flex h-screen w-64 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] shadow-[-8px_0_30px_rgba(0,0,0,0.025)]">

            <SidebarBrand
                onNavigate={
                    variant === 'superAdmin'
                        ? undefined
                        : onNavigate
                }
            />

            {variant === 'superAdmin' ? (
                <SuperAdminSidebarContent
                    onReturnToEnvironment={
                        onReturnToEnvironment
                    }
                />
            ) : (
                <nav className="tamar-sidebar-default-nav-v3 tamar-v22-sidebar-nav tamar-reference-sidebar-nav flex min-h-0 flex-1 flex-col px-4 py-3">

                    <SidebarBackAction
                        onClick={() => onNavigate('hierarchy')}
                    />

                    <div className="tamar-sidebar-nav-items-v3">
                        {standardNavItems.map((item) => (
                            <SidebarNavItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                badge={item.badge}
                                isActive={
                                    currentView === item.id
                                }
                                onClick={() =>
                                    onNavigate(item.id)
                                }
                            />
                        ))}
                    </div>

                </nav>
            )}

            <SidebarFooter
                currentUser={currentUser}
            />

        </aside>
    );
};

export default Sidebar;
