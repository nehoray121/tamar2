import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const ImmediateTreatmentPanel = ({
    items = [],
    expanded,
    onToggle,
    onInspect
}) => {
    const visible = items;

    return (
        <DashboardCard
            className={`tamar-claude-dashboard-card ${
                expanded ? 'tamar-claude-dashboard-card--bottom-expanded' : ''
            }`}
            dir="rtl"
        >
            <div className="tamar-claude-card-header">
                <div className="tamar-claude-card-header__main">
                    <span className="tamar-claude-icon-chip tamar-claude-icon-chip--danger">
                        <Icon name="alertTriangle" className="h-[15px] w-[15px]" />
                    </span>
                    <div>
                        <h2 className="tamar-claude-card-title tamar-claude-card-title--danger">
                            דורש טיפול מיידי
                        </h2>
                        <p className="tamar-claude-card-subtitle">
                            פניות בדחיפות גבוהה או בינונית שממתינות לטיפול
                        </p>
                    </div>
                </div>

                <div className="tamar-claude-card-header__actions">
                    <span className="tamar-claude-count-chip tamar-claude-count-chip--danger">
                        {items.length}
                    </span>
                    <SectionExpandButton
                        expanded={expanded}
                        onClick={onToggle}
                        title={expanded ? 'מזער' : 'הרחב'}
                    />
                </div>
            </div>

            <div
                className={`tamar-claude-attention-list ${
                    expanded ? 'tamar-claude-attention-list--expanded' : ''
                } ${
                    items.length > 2 ? 'tamar-claude-attention-list--scroll' : ''
                }`}
            >
                {visible.length === 0 ? (
                    <div className="tamar-claude-empty">
                        אין פניות שדורשות טיפול מיידי
                    </div>
                ) : (
                    visible.map((item) => {
                        const subject = item.subject || item.requester || 'פנייה';
                        const assignee = item.assigneeLabel || item.assignee || 'לא משויך';

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onInspect(item)}
                                className="tamar-claude-attention-row"
                            >
                                <span className="tamar-claude-attention-row__dot" />

                                <span className="tamar-claude-attention-row__text">
                                    <strong title={`${item.id} · ${subject}`}>
                                        {item.id} · {subject}
                                    </strong>
                                    <small>{assignee} · {item.durationLabel || '—'}</small>
                                </span>

                                <Icon name="chevronLeft" className="h-3.5 w-3.5" />
                            </button>
                        );
                    })
                )}
            </div>
        </DashboardCard>
    );
};

export default ImmediateTreatmentPanel;
