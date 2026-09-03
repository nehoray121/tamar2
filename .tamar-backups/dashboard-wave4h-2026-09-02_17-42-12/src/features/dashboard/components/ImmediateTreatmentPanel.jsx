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
            className={`dashboard-v4g-attention ${
                expanded ? 'dashboard-v4g-attention--expanded' : ''
            }`}
            dir="rtl"
        >
            <header className="dashboard-v4g-card-header">
                <div className="dashboard-v4g-card-header__main">
                    <span className="dashboard-v4g-icon-chip dashboard-v4g-icon-chip--danger">
                        <Icon name="target" className="h-[15px] w-[15px]" />
                    </span>

                    <div className="dashboard-v4g-card-header__titles">
                        <h2 className="dashboard-v4g-card-header__title dashboard-v4g-card-header__title--danger">
                            דורש טיפול מיידי
                        </h2>
                        <p className="dashboard-v4g-card-header__subtitle">
                            פניות בדחיפות גבוהה שממתינות לטיפול
                        </p>
                    </div>
                </div>

                <div className="dashboard-v4g-card-header__actions">
                    <span className="dashboard-v4g-count-chip dashboard-v4g-count-chip--danger">
                        <strong>{items.length}</strong>
                    </span>

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
                </div>
            </header>

            {visibleItems.length === 0 ? (
                <div className="dashboard-v4g-empty">
                    <span className="dashboard-v4g-empty__icon dashboard-v4g-empty__icon--success">
                        <Icon name="check" className="h-4 w-4" />
                    </span>
                    <strong>אין פניות שדורשות טיפול מיידי</strong>
                    <span>כל הפניות נמצאות כרגע בטווח הטיפול.</span>
                </div>
            ) : (
                <div className="dashboard-v4g-attention-list">
                    {visibleItems.map((item) => {
                        const priority = String(item.priority || '—')
                            .replace(/-\d+$/, '');
                        const assignee = item.assigneeLabel
                            || item.assignee
                            || 'ללא שיוך';
                        const subject = item.subject
                            || item.requester
                            || 'פנייה הדורשת טיפול';

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className="dashboard-v4g-attention-row"
                                onClick={() => onInspect(item)}
                            >
                                <span
                                    className="dashboard-v4g-attention-row__dot"
                                    aria-hidden="true"
                                />

                                <span className="dashboard-v4g-attention-row__content">
                                    <strong
                                        className="dashboard-v4g-attention-row__title"
                                        title={`${item.id} · ${subject}`}
                                    >
                                        {item.id} · {subject}
                                    </strong>
                                    <span
                                        className="dashboard-v4g-attention-row__meta"
                                        title={`${priority} · ${assignee}`}
                                    >
                                        {priority} · {assignee}
                                    </span>
                                </span>

                                <span className="dashboard-v4g-attention-row__time">
                                    <Icon name="clock" className="h-3.5 w-3.5" />
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
