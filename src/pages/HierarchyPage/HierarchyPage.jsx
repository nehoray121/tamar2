import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import ThemeControl from '../../features/theme/ThemeControl.jsx';
import { Badge } from '../../components/ui/index.js';
import { useRoomHierarchy } from '../../features/rooms/hooks/useRoomHierarchy.js';
import { buildHierarchyBreadcrumb } from '../../features/rooms/services/hierarchyBreadcrumbModel.js';
import CreateItemModal from './CreateItemModal.jsx';

const ActionButton = ({ children, onClick, primary = false, className = '', ...props }) => (
    <button
        type="button"
        onClick={onClick}
        {...props}
        className={primary
            ? `inline-flex h-[39px] items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--color-primary)] px-3.5 text-[12px] font-black text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${className}`
            : `inquiry-control inline-flex h-[39px] items-center justify-center gap-2 rounded-xl px-3.5 text-[12px] font-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${className}`
        }
    >
        {children}
    </button>
);

const getStats = (item, level, rooms = []) => {
    const active = item.isActive !== false;
    if (level === 'sub_envs') {
        const roomCount = rooms.filter((room) => room.subEnvironmentId === item.id).length;
        return {
            children: roomCount,
            recent: `${roomCount} חדרים פעילים`,
            status: active ? 'פעילה' : 'לא פעילה'
        };
    }
    return {
        children: 0,
        recent: active ? 'חדר פעיל' : 'חדר לא פעיל',
        status: active ? 'פעילה' : 'לא פעילה'
    };
};

const BreadcrumbButton = ({ children, onClick, active = false, testId, level }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={active}
        data-testid={testId}
        data-breadcrumb-segment={level}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex h-8 max-w-[220px] items-center rounded-lg px-2.5 text-[11px] font-black transition ${
            active
                ? 'cursor-default text-[var(--color-text-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
        }`}
    >
        <span dir="auto" className="truncate">{children}</span>
    </button>
);

const EntityCard = ({ item, level, selected, onSelect, onOpen, parentName, rooms }) => {
    const stats = getStats(item, level, rooms);
    const isRoom = level === 'rooms';

    return (
        <article
            data-testid="organization-entity-card"
            data-entity-id={item.id}
            data-entity-level={level}
            className={`tamar-hierarchy-entity-v3 group relative flex min-h-[204px] flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition hover:border-[var(--color-primary)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.10)] dark:shadow-none ${selected ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary-soft)_34%,var(--color-surface-raised))] ring-1 ring-[var(--color-primary)]' : 'border-[var(--color-border-strong)]'}`}
            onClick={onSelect}
        >
            <span aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-[inherit] bg-[color-mix(in_srgb,var(--color-primary-soft)_28%,transparent)] transition-opacity duration-150 ${selected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />
            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <Icon name={isRoom ? 'dashboard' : 'layers'} className="h-[15px] w-[15px]" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="truncate text-[18px] font-black text-[var(--color-text-primary)]">{item.name}</h3>
                        <p className="mt-1.5 truncate text-[11px] font-bold text-[var(--color-text-muted)]">
                            {isRoom ? `${parentName || 'תת־סביבה'} / חדר פעיל` : 'תת־סביבה זמינה לניהול חדרים'}
                        </p>
                    </div>
                </div>
                <Badge type={stats.status === 'בעומס' ? 'medium' : 'active'}>{stats.status}</Badge>
            </div>

            <div className="relative z-10 mt-auto grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-center text-[12px] font-black text-[var(--color-text-secondary)]">
                <span className="border-l border-[var(--color-border)] px-3 py-2.5">{isRoom ? 'חדר ארגוני' : `${stats.children} חדרים`}</span>
                <span className="px-3 py-2.5">{stats.recent}</span>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2 pt-4">
                <button data-testid="organization-entity-open" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }} className="h-10 flex-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[13px] font-black text-[var(--color-text-secondary)] transition group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                    {isRoom ? 'פתח חדר' : 'פתח תת־סביבה'}
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]" aria-label="בחר לפרטים">
                    <Icon name="info" className="h-4 w-4" />
                </button>
            </div>
        </article>
    );
};

const GuidancePanel = ({ selectedItem, level, selectedEnvironment, selectedSubEnvironment, rooms, onOpenUserManagement, onOpenEnvModal, onBack }) => {
    const stats = selectedItem ? getStats(selectedItem, level, rooms) : null;
    const isRoom = level === 'rooms';
    const title = selectedItem?.name || 'בחרו פריט כדי לראות פרטים';
    const path = buildHierarchyBreadcrumb({
        selectedEnvironment,
        selectedSubEnvironment: isRoom ? selectedSubEnvironment : selectedItem,
        selectedRoom: isRoom ? selectedItem : null
    }).map((segment) => segment.name).join(' / ');

    return (
        <aside className="tamar-hierarchy-guidance-v3 hierarchy-layout__sidebar flex min-h-0 flex-col rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-[var(--color-text-muted)]">פרטי בחירה</p>
                    <h2 className="mt-3 truncate text-[22px] font-black text-[var(--color-text-primary)]">{title}</h2>
                    <p className="mt-2 line-clamp-2 text-[12px] font-bold text-[var(--color-text-secondary)]">{path}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon name={isRoom ? 'dashboard' : 'layers'} className="h-4 w-4" />
                </span>
            </div>

            {selectedItem ? (
                <div className="mt-4 grid gap-3 text-center text-[12px] font-bold">
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
                        <div className="text-[10px] text-[var(--color-text-muted)]">{isRoom ? 'משתמשים' : 'חדרים'}</div>
                        <div className="mt-1.5 text-[17px] font-black text-[var(--color-text-primary)]">{isRoom ? 'פעיל' : stats.children}</div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
                        <div className="text-[10px] text-[var(--color-text-muted)]">פעילות</div>
                        <div className="mt-1.5 text-[17px] font-black text-[var(--color-text-primary)]">{stats.recent}</div>
                    </div>
                </div>
            ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-4 text-[12px] font-bold leading-6 text-[var(--color-text-secondary)]">
                    בחרו פריט מהרשימה כדי לראות נתונים ופעולות רלוונטיות.
                </div>
            )}

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-4 text-[12px] font-bold leading-6 text-[var(--color-text-secondary)]">
                {isRoom
                    ? 'בחדר ניתן לנהל משתמשים, לעקוב אחר עומס פתוח ולהמשיך לטיפול בפניות.'
                    : 'בתת־סביבה ניתן לפתוח חדרים, לעקוב אחר פעילות ולשמור על מבנה היררכי נקי.'}
            </div>

            <div className="tamar-hierarchy-footer-actions mt-auto flex flex-wrap gap-2 pt-5">
                {isRoom && <ActionButton onClick={onBack}><Icon name="arrowRight" className="h-3.5 w-3.5" /> חזרה</ActionButton>}
                {isRoom ? (
                    <ActionButton onClick={onOpenUserManagement}><Icon name="users" className="h-3.5 w-3.5" /> משתמשים</ActionButton>
                ) : (
                    <ActionButton onClick={onOpenEnvModal}><Icon name="arrowDownUp" className="h-3.5 w-3.5" /> החלף סביבה</ActionButton>
                )}
            
                <div
                    className="tamar-hierarchy-inline-theme"
                    aria-label="מצב תצוגה"
                >
                    <ThemeControl />
                </div></div>
        </aside>
    );
};

const HierarchyPage = ({ onOpenEnvModal, onOpenUserManagement, onRoomSelect }) => {
    const [selectedSubEnvironment, setSelectedSubEnvironment] = useState(null);
    const {
        level, setLevel, showCreateModal, setShowCreateModal, selectedEnvironment,
        subEnvs, roomsList, hierarchyStatus, hierarchyError, retryHierarchy,
        canCreateSubEnvironment, canCreateRoomFor, createSubEnvironment, createRoom
    } = useRoomHierarchy({ selectedSubEnvironmentId: selectedSubEnvironment?.id });
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        setSelectedSubEnvironment(null);
        setSelectedId(null);
        setQuery('');
        setStatusFilter('all');
        setShowCreateModal(null);
        setLevel('sub_envs');
        setNotice('');
    }, [selectedEnvironment?.id, setLevel, setShowCreateModal]);

    useEffect(() => {
        if (!selectedSubEnvironment) return;
        const canonical = subEnvs.find((item) => item.id === selectedSubEnvironment.id);
        if (!canonical) {
            setSelectedSubEnvironment(null);
            setSelectedId(null);
            setLevel('sub_envs');
            return;
        }
        if (canonical !== selectedSubEnvironment) setSelectedSubEnvironment(canonical);
    }, [selectedSubEnvironment, setLevel, subEnvs]);

    const collection = level === 'sub_envs'
        ? subEnvs
        : roomsList.filter((room) => room.subEnvironmentId === selectedSubEnvironment?.id);
    const filteredCollection = useMemo(() => collection.filter((item) => {
        const stats = getStats(item, level, roomsList);
        const normalizedQuery = query.trim();
        const matchesQuery = !normalizedQuery || item.name.includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || stats.status === statusFilter;
        return matchesQuery && matchesStatus;
    }), [collection, level, query, roomsList, statusFilter]);
    const selectedItem = filteredCollection.find((item) => item.id === selectedId) || filteredCollection[0] || null;
    const canCreateCurrent = level === 'sub_envs'
        ? canCreateSubEnvironment
        : canCreateRoomFor(selectedSubEnvironment);
    const breadcrumb = buildHierarchyBreadcrumb({
        selectedEnvironment,
        selectedSubEnvironment: level === 'rooms' ? selectedSubEnvironment : null,
        selectedRoom: level === 'rooms' && selectedId
            ? roomsList.find((room) => room.id === selectedId) || null
            : null
    });

    const openItem = (item) => {
        setNotice('');
        if (level === 'sub_envs') {
            setSelectedSubEnvironment(item);
            setSelectedId(null);
            setQuery('');
            setStatusFilter('all');
            setLevel('rooms');
        } else {
            onRoomSelect(item);
        }
    };

    const backToSubEnvs = () => {
        setSelectedSubEnvironment(null);
        setSelectedId(null);
        setQuery('');
        setStatusFilter('all');
        setShowCreateModal(null);
        setLevel('sub_envs');
    };
    const openAllEnvironments = () => {
        backToSubEnvs();
        onOpenEnvModal();
    };
    const backToSelectedSubEnvironment = () => {
        setSelectedId(null);
        setQuery('');
        setStatusFilter('all');
        setShowCreateModal(null);
        setLevel('rooms');
    };
    const handleBreadcrumbClick = (segment) => {
        if (segment.level === 'root') openAllEnvironments();
        if (segment.level === 'environment') backToSubEnvs();
        if (segment.level === 'subEnvironment') backToSelectedSubEnvironment();
    };
    const handleCreated = (created) => {
        const createdRoom = showCreateModal === 'room';
        setLevel(createdRoom ? 'rooms' : 'sub_envs');
        setSelectedId(created?.id || null);
        setNotice(createdRoom
            ? 'החדר נוצר ונשמר בהצלחה.'
            : 'תת-הסביבה נוצרה ונשמרה בהצלחה.');
    };


    if (hierarchyStatus === 'loading') {
        return <div data-testid="hierarchy-loading" className="inquiry-page-surface flex h-full items-center justify-center" role="status" aria-live="polite" dir="rtl"><span className="text-sm font-black text-[var(--color-text-secondary)]">טוענים חדרים מהמבנה הארגוני...</span></div>;
    }
    if (hierarchyError) {
        return (
            <div data-testid="hierarchy-error" className="inquiry-page-surface flex h-full items-center justify-center p-6" role="alert" dir="rtl">
                <section className="max-w-md rounded-2xl border border-red-400/30 bg-[var(--color-surface-raised)] p-6 text-center">
                    <h2 className="text-base font-black text-[var(--color-text-primary)]">לא ניתן לטעון את החדרים</h2>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">{hierarchyError}</p>
                    <button type="button" onClick={retryHierarchy} className="mt-4 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-black text-white">בדיקה מחדש</button>
                </section>
            </div>
        );
    }

    return (
        <div className="tamar-hierarchy-page-v3 inquiry-page-surface flex h-full min-h-0 flex-col overflow-hidden" dir="rtl">
            <div className="tamar-hierarchy-brandbar-v4" aria-label="תמ״ר">
    <div className="tamar-hierarchy-brandbar-v4__inner">
        <span className="tamar-hierarchy-brandbar-v4__logo">תמ״ר</span>
    </div>
</div>
<header className="tamar-hierarchy-header-v3 flex shrink-0 items-center justify-between gap-4 px-6 pb-3 pt-5">
    <div className="min-w-0 text-right">
        <h1 className="text-[25px] font-black leading-8 tracking-tight text-[var(--color-text-primary)]">
            {level === 'sub_envs'
                ? 'בחירת תת־סביבה'
                : 'בחירת חדר'}
        </h1>

        <p className="mt-1 text-[13px] font-semibold text-[var(--color-text-secondary)]">
            {level === 'sub_envs'
                ? `בחרו תת־סביבה מתוך ${selectedEnvironment?.name || 'הסביבה הנבחרת'}`
                : `בחרו חדר מתוך ${selectedSubEnvironment?.name || 'תת־הסביבה הנבחרת'}`}
        </p>
    </div>

    <div className="tamar-hierarchy-context-v3 flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon
                name={level === 'sub_envs' ? 'layers' : 'dashboard'}
                className="h-4 w-4"
            />
        </span>

        <div className="text-right">
            <div className="text-[10px] font-bold text-[var(--color-text-muted)]">
                {level === 'sub_envs'
                    ? 'סביבה נוכחית'
                    : 'תת־סביבה נוכחית'}
            </div>

            <div className="max-w-[220px] truncate text-[12px] font-black text-[var(--color-text-primary)]">
                {level === 'sub_envs'
                    ? selectedEnvironment?.name
                    : selectedSubEnvironment?.name}
            </div>
        </div>
    </div>
</header>

            <main className="tamar-hierarchy-main-v3 min-h-0 flex-1 px-5 pb-5 pt-2">
                <div className="hierarchy-layout">
                    <section className="hierarchy-layout__content flex min-h-0 flex-col overflow-hidden">
                        <div className="tamar-hierarchy-toolbar-v3 mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5">
                            <nav
                                data-testid="organization-breadcrumb"
                                data-breadcrumb-direction="rtl-row"
                                dir="rtl"
                                className="inquiry-control flex min-w-0 flex-row items-center gap-1 rounded-xl px-3"
                                aria-label="נתיב היררכיה"
                            >
                                {(
                                    /* currentEnvironmentBreadcrumbItemsV10:
                                       current selected environment is always the FIRST breadcrumb item.
                                       Reuse the existing environment segment when present so its click/navigation
                                       behavior stays intact; only synthesize a display segment if the helper omitted it. */
                                    selectedEnvironment
                                        ? [
                                            (
                                                breadcrumb.find((candidate) => candidate.level === 'environment')
                                                || {
                                                    key: `environment-${selectedEnvironment.id || selectedEnvironment._id || selectedEnvironment.name}`,
                                                    level: 'environment',
                                                    name: selectedEnvironment.name
                                                }
                                            ),
                                            ...breadcrumb.filter((candidate) => candidate.level !== 'environment')
                                        ]
                                        : breadcrumb
                                ).map((segment, index, displayBreadcrumb) => {
                                    const active = index === displayBreadcrumb.length - 1;
                                    return (
                                        <React.Fragment key={segment.key}>
                                            {index > 0 && <span aria-hidden="true" dir="ltr" className="text-[var(--color-text-muted)]">/</span>}
                                            <BreadcrumbButton
                                                active={active}
                                                onClick={() => handleBreadcrumbClick(segment)}
                                                testId={'organization-breadcrumb-' + segment.key}
                                                level={segment.level}
                                            >
                                                {segment.name}
                                            </BreadcrumbButton>
                                        </React.Fragment>
                                    );
                                })}
                            </nav>

                            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                                <div className="relative min-w-[220px] max-w-[340px] flex-1">
                                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="inquiry-input-surface h-[39px] w-full rounded-xl px-3 pl-9 text-[12px] font-bold outline-none focus:border-[var(--color-primary)]" placeholder="חיפוש לפי שם..." />
                                    <Icon name="search" className="absolute left-3 top-[11px] h-4 w-4 text-[var(--color-text-muted)]" />
                                </div>
                                <ActionButton onClick={onOpenEnvModal}><Icon name="arrowDownUp" className="h-3.5 w-3.5" /> החלף סביבה</ActionButton>
                                {canCreateCurrent && (
                                    <ActionButton
                                        data-testid="organization-create-action"
                                        primary
                                        onClick={() => setShowCreateModal(level === 'sub_envs' ? 'sub_env' : 'room')}
                                    >
                                        <Icon name="plus" className="h-3.5 w-3.5" />
                                        {level === 'sub_envs' ? 'יצירת תת-סביבה' : 'יצירת חדר'}
                                    </ActionButton>
                                )}
                            </div>
                        </div>

                        {notice && (
                            <div role="status" aria-live="polite" className="mb-3 shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-black text-emerald-700 dark:text-emerald-300">
                                {notice}
                            </div>
                        )}

                        <div className="hierarchy-content-panel">
                            {filteredCollection.length > 0 ? (
                                <div className="tamar-hierarchy-cards-v3 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                {filteredCollection.map((item) => (
                                    <EntityCard key={item.id} item={item} level={level} rooms={roomsList} selected={selectedItem?.id === item.id} parentName={selectedSubEnvironment?.name} onSelect={() => setSelectedId(item.id)} onOpen={() => openItem(item)} />
                                ))}
                            </div>
                            ) : (
                                <div className="hierarchy-content-empty">
                                    <span className="hierarchy-content-empty__icon" aria-hidden="true">
                                        <Icon
                                            name={level === 'sub_envs' ? 'layers' : 'dashboard'}
                                            className="h-5 w-5"
                                        />
                                    </span>
                                    <div>
                                        <p className="hierarchy-content-empty__title">
                                            {level === 'sub_envs'
                                                ? 'אין תת־סביבות להצגה'
                                                : 'אין חדרים להצגה'}
                                        </p>
                                        <p className="hierarchy-content-empty__text">
                                            {query
                                                ? 'לא נמצאו תוצאות לחיפוש הנוכחי.'
                                                : 'אפשר ליצור פריט חדש באמצעות כפתור היצירה למעלה.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <GuidancePanel selectedItem={selectedItem} level={level} selectedEnvironment={selectedEnvironment} selectedSubEnvironment={selectedSubEnvironment} rooms={roomsList} onOpenUserManagement={onOpenUserManagement} onOpenEnvModal={onOpenEnvModal} onBack={backToSubEnvs} />
                </div>
            </main>

            <CreateItemModal
                type={showCreateModal}
                open={Boolean(showCreateModal)}
                onClose={() => setShowCreateModal(null)}
                onCreateSubEnvironment={createSubEnvironment}
                onCreateRoom={(input) => createRoom(selectedSubEnvironment, input)}
                onSuccess={handleCreated}
            />
        </div>
    );
};

export default HierarchyPage;
