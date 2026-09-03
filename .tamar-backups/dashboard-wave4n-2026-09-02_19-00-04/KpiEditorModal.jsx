import React, { useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import KpiCard from './DashboardKpiCard.jsx';

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
    const canRemoveMore = selectedIds.length > 0;

    return (
        <div className="dashboard-modal-layer-v4b" dir="rtl">
            <button
                type="button"
                aria-label="סגור חלון עריכת כרטיסיות"
                className="dashboard-modal-scrim-v4b"
                onClick={onClose}
            />

            <section
                className="dashboard-modal-v4b dashboard-modal-v4b--kpi"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-kpi-editor-title"
            >
                <header className="dashboard-modal-v4b__header">
                    <div>
                        <h2
                            id="dashboard-kpi-editor-title"
                            className="dashboard-modal-v4b__title"
                        >
                            עריכת מדדי דשבורד
                        </h2>
                        <p className="dashboard-modal-v4b__subtitle">
                            בחרו עד 6 מדדים להצגה וסדרו אותם לפי הצורך.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור חלון עריכת כרטיסיות"
                        className="tamar-ui-icon-btn tamar-ui-icon-btn--sm"
                    >
                        <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                </header>

                <div className="dashboard-modal-v4b__body">
                    <section className="dashboard-kpi-editor-section-v4b">
                        <div className="dashboard-kpi-editor-section-v4b__head">
                            <div>
                                <h3>מדדים מוצגים</h3>
                                <p>
                                    {selectedIds.length} מתוך 6 מוצגים
                                    בדשבורד
                                </p>
                            </div>

                            <span className="dashboard-count-chip-v4b">
                                נבחרו <strong>{selectedIds.length}</strong>
                                <span>מתוך 6</span>
                            </span>
                        </div>

                        <div className="dashboard-kpi-editor-grid-v4b">
                            {visibleKpis.map((kpi, index) => (
                                <div
                                    key={kpi.id}
                                    className="dashboard-kpi-editor-item-v4b"
                                >
                                    <KpiCard
                                        {...kpi}
                                        mode="modal"
                                        actionIcon="trash"
                                        actionLabel={`הסר כרטיסייה ${kpi.title}`}
                                        onAction={() => onRemove(kpi.id)}
                                        isActionDisabled={!canRemoveMore}
                                    />

                                    <div className="dashboard-kpi-editor-order-v4b">
                                        <span>מיקום {index + 1}</span>

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onMove(index, index - 1)
                                                }
                                                disabled={index === 0}
                                                className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                            >
                                                <Icon
                                                    name="arrowUpStraight"
                                                    className="h-3 w-3"
                                                />
                                                למעלה
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onMove(index, index + 1)
                                                }
                                                disabled={
                                                    index
                                                    === visibleKpis.length - 1
                                                }
                                                className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                            >
                                                <Icon
                                                    name="arrowDownStraight"
                                                    className="h-3 w-3"
                                                />
                                                למטה
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="dashboard-kpi-editor-section-v4b">
                        <div className="dashboard-kpi-editor-section-v4b__head">
                            <div>
                                <h3>מדדים זמינים</h3>
                                <p>
                                    מדדים שלא מוצגים כרגע נשארים זמינים
                                    להוספה.
                                </p>
                            </div>
                        </div>

                        <div className="dashboard-kpi-available-grid-v4b">
                            {hiddenKpis.length ? (
                                hiddenKpis.map((kpi) => (
                                    <article
                                        key={kpi.id}
                                        className="dashboard-kpi-available-v4b"
                                    >
                                        <div>
                                            <strong>{kpi.title}</strong>
                                            {kpi.subtitle && (
                                                <span>{kpi.subtitle}</span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onAdd(kpi.id)}
                                            disabled={!canAddMore}
                                            className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                        >
                                            <Icon
                                                name="plus"
                                                className="h-3 w-3"
                                            />
                                            הוסף
                                        </button>
                                    </article>
                                ))
                            ) : (
                                <div className="dashboard-empty-v4b dashboard-empty-v4b--dense">
                                    <strong>
                                        כל המדדים הזמינים כבר מוצגים
                                    </strong>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <footer className="dashboard-modal-v4b__footer">
                    <span className="dashboard-modal-v4b__meta">
                        נבחרו {selectedIds.length} מתוך 6
                    </span>

                    <div className="dashboard-modal-v4b__footer-actions">
                        <button
                            type="button"
                            onClick={onSave}
                            className="tamar-ui-btn tamar-ui-btn--primary"
                        >
                            שמירה
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="tamar-ui-btn tamar-ui-btn--secondary"
                        >
                            ביטול
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default KpiEditorModal;
