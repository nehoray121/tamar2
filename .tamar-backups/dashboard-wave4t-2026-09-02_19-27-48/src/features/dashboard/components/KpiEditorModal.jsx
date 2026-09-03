import React, { useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const TrashIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="tamar-kpi-editor-trash-svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3.5 6.5h17" />
        <path d="M9 6.5V5.2c0-.66.54-1.2 1.2-1.2h3.6c.66 0 1.2.54 1.2 1.2v1.3" />
        <path d="M6.8 6.5l.92 11.03A2 2 0 0 0 9.71 19.4h4.58a2 2 0 0 0 1.99-1.87L17.2 6.5" />
        <path d="M10.25 10.2v4.9" />
        <path d="M13.75 10.2v4.9" />
    </svg>
);

const SelectedMetricCard = ({
    kpi,
    index,
    count,
    onMove,
    onRemove
}) => {
    const canMoveUp = index > 0;
    const canMoveDown = index < count - 1;

    return (
        <article className="tamar-kpi-editor-card">
            <div className="tamar-kpi-editor-card__top">
                <span className="tamar-kpi-editor-card__icon">
                    <Icon name={kpi.icon} className="h-[16px] w-[16px]" />
                </span>

                <div className="tamar-kpi-editor-card__copy">
                    <strong>{kpi.title}</strong>
                    {kpi.subtitle && <small>{kpi.subtitle}</small>}
                </div>

                <strong className="tamar-kpi-editor-card__value">
                    {kpi.value}
                </strong>
            </div>

            <div className="tamar-kpi-editor-card__controls">
                <span className="tamar-kpi-editor-position">
                    מיקום {index + 1}
                </span>

                <div className="tamar-kpi-editor-move">
                    <button
                        type="button"
                        onClick={() => onMove(index, index - 1)}
                        disabled={!canMoveUp}
                        aria-label={`העבר את ${kpi.title} למעלה`}
                    >
                        <Icon name="arrowUpStraight" className="h-3.5 w-3.5" />
                        למעלה
                    </button>

                    <button
                        type="button"
                        onClick={() => onMove(index, index + 1)}
                        disabled={!canMoveDown}
                        aria-label={`העבר את ${kpi.title} למטה`}
                    >
                        <Icon name="arrowDownStraight" className="h-3.5 w-3.5" />
                        למטה
                    </button>
                </div>
            </div>

            <button
                type="button"
                className="tamar-kpi-editor-card__delete"
                onClick={() => onRemove(kpi.id)}
                aria-label={`הסר את ${kpi.title}`}
                title={`הסר את ${kpi.title}`}
            >
                <TrashIcon />
            </button>
        </article>
    );
};

const AvailableMetricCard = ({ kpi, disabled, onAdd }) => (
    <button
        type="button"
        onClick={() => onAdd(kpi.id)}
        disabled={disabled}
        className="tamar-kpi-editor-available"
    >
        <span className="tamar-kpi-editor-available__icon">
            <Icon name={kpi.icon} className="h-[15px] w-[15px]" />
        </span>

        <span className="tamar-kpi-editor-available__copy">
            <strong>{kpi.title}</strong>
            {kpi.subtitle && <small>{kpi.subtitle}</small>}
        </span>

        <span className="tamar-kpi-editor-available__add">
            <Icon name="plus" className="h-3.5 w-3.5" />
            הוסף
        </span>
    </button>
);

const KpiEditorModal = ({
    isOpen,
    onClose,
    selectedIds,
    kpiDefinitions,
    onMove,
    onAdd,
    onRemove,
    onSave
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const visibleKpis = selectedIds
        .map((id) => kpiDefinitions.find((kpi) => kpi.id === id))
        .filter(Boolean);

    const hiddenKpis = kpiDefinitions.filter(
        (kpi) => !selectedIds.includes(kpi.id)
    );

    const canAddMore = selectedIds.length < 6;

    return (
        <div className="tamar-kpi-editor-overlay">
            <button
                type="button"
                aria-label="סגור חלון עריכת מדדים"
                className="tamar-kpi-editor-backdrop"
                onClick={onClose}
            />

            <section
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tamar-kpi-editor-title"
                className="tamar-kpi-editor"
            >
                <header className="tamar-kpi-editor__header">
                    <div>
                        <h2 id="tamar-kpi-editor-title">
                            עריכת מדדי דשבורד
                        </h2>
                        <p>
                            בחר עד 6 מדדים, סדר אותם ושמור את תצוגת הדשבורד.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור חלון עריכת מדדים"
                        className="tamar-kpi-editor__close"
                    >
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </header>

                <div className="tamar-kpi-editor__body">
                    <section className="tamar-kpi-editor-section">
                        <div className="tamar-kpi-editor-section__head">
                            <div>
                                <h3>מדדים מוצגים</h3>
                                <p>
                                    {selectedIds.length} מתוך 6 מוצגים בדשבורד
                                </p>
                            </div>

                            <span className="tamar-kpi-editor-count">
                                {selectedIds.length}
                                <small>/6</small>
                            </span>
                        </div>

                        <div className="tamar-kpi-editor-grid">
                            {visibleKpis.map((kpi, index) => (
                                <SelectedMetricCard
                                    key={kpi.id}
                                    kpi={kpi}
                                    index={index}
                                    count={visibleKpis.length}
                                    onMove={onMove}
                                    onRemove={onRemove}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="tamar-kpi-editor-section tamar-kpi-editor-section--available">
                        <div className="tamar-kpi-editor-section__head">
                            <div>
                                <h3>מדדים זמינים</h3>
                                <p>
                                    הוסף מדדים שאינם מוצגים כרגע.
                                </p>
                            </div>
                        </div>

                        {hiddenKpis.length > 0 ? (
                            <div className="tamar-kpi-editor-available-grid">
                                {hiddenKpis.map((kpi) => (
                                    <AvailableMetricCard
                                        key={kpi.id}
                                        kpi={kpi}
                                        disabled={!canAddMore}
                                        onAdd={onAdd}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="tamar-kpi-editor-empty">
                                כל המדדים הזמינים כבר מוצגים.
                            </div>
                        )}
                    </section>
                </div>

                <footer className="tamar-kpi-editor__footer">
                    <span>
                        נבחרו <strong>{selectedIds.length}</strong> מתוך 6
                    </span>

                    <div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="tamar-kpi-editor-btn tamar-kpi-editor-btn--secondary"
                        >
                            ביטול
                        </button>

                        <button
                            type="button"
                            onClick={onSave}
                            className="tamar-kpi-editor-btn tamar-kpi-editor-btn--primary"
                        >
                            שמירה
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default KpiEditorModal;
