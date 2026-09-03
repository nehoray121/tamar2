import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import DashboardInquiryListItem from './DashboardInquiryListItem.jsx';

const normalizeSearch = (value) => String(value || '')
    .trim()
    .toLocaleLowerCase('he-IL');

const DashboardWorkloadModal = ({
    isOpen,
    people = [],
    onClose,
    onSelectTask
}) => {
    const [selectedPersonId, setSelectedPersonId] = useState(null);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        setSelectedPersonId(null);
        setSearchValue('');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const selectedPerson = people.find(
        (person) => person.id === selectedPersonId
    ) || null;

    const query = normalizeSearch(searchValue);

    const visiblePeople = useMemo(() => {
        if (!query) return people;

        return people.filter((person) => normalizeSearch([
            person.name,
            person.total,
            person.urgent
        ].join(' ')).includes(query));
    }, [people, query]);

    const visibleTasks = useMemo(() => {
        const tasks = selectedPerson?.tasks || [];
        if (!query) return tasks;

        return tasks.filter((item) => normalizeSearch([
            item.id,
            item.ticketNumber,
            item.displayId,
            item.subject,
            item.requester,
            item.description,
            item.priority,
            item.assignee,
            item.assigneeLabel
        ].filter(Boolean).join(' ')).includes(query));
    }, [query, selectedPerson]);

    if (!isOpen) return null;

    const resultCount = selectedPerson
        ? visibleTasks.length
        : visiblePeople.length;

    return (
        <div className="dashboard-workload-modal-layer" dir="rtl">
            <button
                type="button"
                className="dashboard-workload-modal-scrim"
                aria-label="סגור חלון עומס נציגים"
                onClick={onClose}
            />

            <section
                className="dashboard-workload-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-workload-modal-title"
            >
                <header className="dashboard-workload-modal__header">
                    <div>
                        <h2 id="dashboard-workload-modal-title">
                            {selectedPerson
                                ? `המשימות של ${selectedPerson.name}`
                                : 'עומס נציגים בחדר'}
                        </h2>
                        <p>
                            {selectedPerson
                                ? `${selectedPerson.tasks.length} משימות משויכות לנציג`
                                : `${people.length} נציגים בחדר · בחר נציג לצפייה במשימות`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור"
                        className="dashboard-workload-modal__close"
                    >
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </header>

                <div className="dashboard-workload-modal__toolbar">
                    {selectedPerson && (
                        <button
                            type="button"
                            className="dashboard-workload-modal__back"
                            onClick={() => {
                                setSelectedPersonId(null);
                                setSearchValue('');
                            }}
                        >
                            <Icon name="arrowRight" className="h-3.5 w-3.5" />
                            חזרה לנציגים
                        </button>
                    )}

                    <label className="dashboard-workload-modal__search">
                        <Icon name="search" className="h-4 w-4" />
                        <input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder={selectedPerson
                                ? 'חיפוש לפי מספר משימה, נושא או תיאור...'
                                : 'חיפוש נציג...'}
                        />
                    </label>

                    <span className="dashboard-workload-modal__count">
                        <strong>{resultCount}</strong>
                        <span>{selectedPerson ? 'משימות' : 'נציגים'}</span>
                    </span>
                </div>

                <div className="dashboard-workload-modal__body">
                    {selectedPerson ? (
                        visibleTasks.length ? (
                            <div className="dashboard-workload-modal__task-list">
                                {visibleTasks.map((item) => (
                                    <DashboardInquiryListItem
                                        key={item.id || item.ticketNumber}
                                        item={item}
                                        onSelect={onSelectTask}
                                        actionLabel="פתח משימה בטבלה"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-workload-modal__empty">
                                <span>
                                    <Icon name="inbox" className="h-5 w-5" />
                                </span>
                                <strong>לא נמצאו משימות</strong>
                                <p>
                                    אין משימות תואמות לנציג ולחיפוש הנוכחי.
                                </p>
                            </div>
                        )
                    ) : visiblePeople.length ? (
                        <div className="dashboard-workload-modal__people">
                            {visiblePeople.map((person) => {
                                const initial = person.name?.trim().charAt(0) || 'נ';
                                const urgentPercent = person.total > 0
                                    ? Math.min(100, Math.round((person.urgent / person.total) * 100))
                                    : 0;

                                return (
                                    <button
                                        key={person.id}
                                        type="button"
                                        className="dashboard-workload-person"
                                        onClick={() => {
                                            setSelectedPersonId(person.id);
                                            setSearchValue('');
                                        }}
                                    >
                                        <span className="dashboard-workload-person__avatar">
                                            {initial}
                                        </span>

                                        <span className="dashboard-workload-person__content">
                                            <span className="dashboard-workload-person__head">
                                                <strong>{person.name}</strong>
                                                <span className="dashboard-workload-person__totals">
                                                    {person.total} משימות
                                                </span>
                                            </span>

                                            <span className="dashboard-workload-person__meta">
                                                <span>{person.tasks.length} זמינות לצפייה</span>
                                                <span className={person.urgent > 0
                                                    ? 'dashboard-workload-person__urgent'
                                                    : ''}
                                                >
                                                    {person.urgent} דחופות
                                                </span>
                                            </span>

                                            <span className="dashboard-workload-person__track">
                                                <span style={{ width: `${urgentPercent}%` }} />
                                            </span>
                                        </span>

                                        <Icon name="chevronLeft" className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="dashboard-workload-modal__empty">
                            <span>
                                <Icon name="users" className="h-5 w-5" />
                            </span>
                            <strong>לא נמצאו נציגים</strong>
                            <p>נסו לשנות את מילת החיפוש.</p>
                        </div>
                    )}
                </div>

                <footer className="dashboard-workload-modal__footer">
                    <span>
                        {selectedPerson
                            ? `${visibleTasks.length} תוצאות`
                            : `${visiblePeople.length} נציגים`}
                    </span>

                    <button
                        type="button"
                        onClick={onClose}
                        className="dashboard-workload-modal__footer-close"
                    >
                        סגירה
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default DashboardWorkloadModal;
