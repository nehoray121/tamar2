import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import DashboardInquiryListItem from './DashboardInquiryListItem.jsx';

const DashboardInquiryModal = ({
    modalConfig,
    searchValue,
    onSearchChange,
    onClose,
    onSelectItem
}) => {
    if (!modalConfig.isOpen) return null;

    const itemLabel = modalConfig.itemLabel || 'פניות';
    const query = searchValue.trim().toLowerCase();
    const visibleItems = query
        ? modalConfig.filteredData.filter((item) => {
            const haystack = [
                item.id,
                item.ticketNumber,
                item.displayId,
                item.taskNumber,
                item.requester,
                item.phone,
                item.assignee,
                item.assigneeLabel,
                item.priority,
                item.subject,
                item.description
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        })
        : modalConfig.filteredData;

    return (
        <div className="dashboard-modal-layer-v4b" dir="rtl">
            <button
                type="button"
                className="dashboard-modal-scrim-v4b"
                aria-label="סגור חלון פניות"
                onClick={onClose}
            />

            <section
                className="dashboard-modal-v4b dashboard-modal-v4b--inquiries"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-inquiry-modal-title"
            >
                <header className="dashboard-modal-v4b__header">
                    <div>
                        <h2
                            id="dashboard-inquiry-modal-title"
                            className="dashboard-modal-v4b__title"
                        >
                            {modalConfig.title}
                        </h2>
                        <p className="dashboard-modal-v4b__subtitle">
                            {modalConfig.subtitle}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור"
                        className="tamar-ui-icon-btn tamar-ui-icon-btn--sm"
                    >
                        <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                </header>

                <div className="dashboard-modal-toolbar-v4b">
                    <label className="dashboard-modal-search-v4b">
                        <Icon
                            name="search"
                            className="h-3.5 w-3.5"
                        />
                        <input
                            value={searchValue}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="חיפוש לפי מספר פנייה, שם או נושא..."
                        />
                    </label>

                    <span className="dashboard-count-chip-v4b dashboard-count-chip-v4b--neutral">
                        <strong>{visibleItems.length}</strong>
                        <span>{itemLabel} מוצגות</span>
                    </span>
                </div>

                <div className="dashboard-modal-v4b__body dashboard-modal-v4b__body--list">
                    {visibleItems.length ? (
                        <div className="dashboard-modal-inquiry-list-v4b">
                            {visibleItems.map((item) => (
                                <DashboardInquiryListItem
                                    key={item.id || item.ticketNumber}
                                    item={item}
                                    onSelect={onSelectItem}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="dashboard-empty-v4b">
                            <span className="dashboard-empty-v4b__icon">
                                <Icon name="search" className="h-4 w-4" />
                            </span>
                            <strong>לא נמצאו {itemLabel}</strong>
                            <span>נסו לשנות את מילת החיפוש.</span>
                        </div>
                    )}
                </div>

                <footer className="dashboard-modal-v4b__footer">
                    <span className="dashboard-modal-v4b__meta">
                        {visibleItems.length} תוצאות
                    </span>

                    <div className="dashboard-modal-v4b__footer-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="tamar-ui-btn tamar-ui-btn--secondary"
                        >
                            סגירה
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default DashboardInquiryModal;
