import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const ImmediateTreatmentPanel = ({
    items = [],
    expanded,
    onToggle,
    onInspect
}) => {
    const visibleItems = expanded ? items : items.slice(0, 4);

    return (
        <DashboardCard
            className={`dashboard-attention-card-v4b ${
                expanded ? 'dashboard-panel-expanded-v4b' : ''
            }`}
            dir="rtl"
        >
            <header className="dashboard-surface-header-v4b">
                <div className="dashboard-surface-header-v4b__titles">
                    <div className="dashboard-surface-header-v4b__row">
                        <span className="dashboard-surface-header-v4b__icon dashboard-surface-header-v4b__icon--danger">
                            <Icon name="target" className="h-[15px] w-[15px]" />
                        </span>
                        <h2 className="dashboard-surface-header-v4b__title dashboard-attention-card-v4b__title">
                            דורש טיפול מיידי
                        </h2>
                    </div>
                    <p className="dashboard-surface-header-v4b__subtitle">
                        פניות בעדיפות גבוהה שממתינות לטיפול
                    </p>
                </div>

                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    compact
                    title={
                        expanded
                            ? 'מזער דורש טיפול מיידי'
                            : 'הרחב דורש טיפול מיידי'
                    }
                />
            </header>

            {visibleItems.length === 0 ? (
                <div className="dashboard-empty-v4b">
                    <span className="dashboard-empty-v4b__icon dashboard-empty-v4b__icon--success">
                        <Icon name="check" className="h-4 w-4" />
                    </span>
                    <strong>אין פניות שדורשות טיפול מיידי</strong>
                    <span>כל הפניות נמצאות כרגע בטווח הטיפול.</span>
                </div>
            ) : (
                <div
                    className={`dashboard-attention-list-v4b ${
                        expanded
                            ? 'dashboard-attention-list-v4b--expanded'
                            : ''
                    }`}
                >
                    {visibleItems.map((item) => {
                        const priority = String(item.priority || '—')
                            .replace(/-\d+$/, '');
                        const assignee = item.assigneeLabel
                            || item.assignee
                            || 'ללא שיוך';

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className="dashboard-attention-row-v4b"
                                onClick={() => onInspect(item)}
                            >
                                <span
                                    className="dashboard-attention-row-v4b__dot"
                                    aria-hidden="true"
                                />

                                <span className="dashboard-attention-row-v4b__content">
                                    <strong
                                        className="dashboard-attention-row-v4b__name"
                                        title={item.id}
                                    >
                                        {item.id}
                                    </strong>
                                    <span
                                        className="dashboard-attention-row-v4b__meta"
                                        title={`${priority} · ${assignee}`}
                                    >
                                        {priority} · {assignee}
                                    </span>
                                </span>

                                <span className="dashboard-attention-row-v4b__time">
                                    <Icon
                                        name="clock"
                                        className="h-3.5 w-3.5"
                                    />
                                    {item.durationLabel || '—'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </DashboardCard>
    );
};

export default ImmediateTreatmentPanel;
