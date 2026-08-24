import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const ImmediateTreatmentPanel = ({ items, expanded, onToggle, onInspect }) => {
    const visibleItems = expanded ? items : items.slice(0, 4);

    return (
        <DashboardCard className={`tamar-v22-attention-card dashboard-card-motion flex h-full min-h-0 flex-col ${expanded ? 'dashboard-expanded-card' : ''}`} dir="rtl">
            <div className="tamar-v22-card-header flex shrink-0 items-start justify-between gap-3 px-4 py-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Icon name="target" className="h-4 w-4 text-[var(--color-danger)]" />
                        <h2 className="tamar-v22-card-title tamar-v22-attention-title">דורש טיפול מיידי</h2>
                    </div>
                    <p className="tamar-v22-card-subtitle">פניות בעדיפות גבוהה שממתינות לטיפול</p>
                </div>
                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    title={expanded ? 'מזער דורש טיפול מיידי' : 'הרחב דורש טיפול מיידי'}
                />
            </div>

            <div className={`tamar-v22-attention-list min-h-0 flex-1 ${expanded ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                {!visibleItems.length && (
                    <div className="tamar-v22-empty-state">אין פניות הדורשות טיפול</div>
                )}

                {visibleItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onInspect(item)}
                        className="tamar-v22-attention-row group w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                    >
                        <span className="tamar-v22-attention-dot" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="tamar-v22-attention-name block truncate">{item.id}</span>
                            <span className="tamar-v22-attention-meta block truncate">
                                {item.priority.replace(/-\d+$/, '')} · {item.assigneeLabel}
                            </span>
                        </span>
                        <span className="tamar-v22-attention-time">
                            <Icon name="clock" className="h-3.5 w-3.5" />
                            {item.durationLabel}
                        </span>
                    </button>
                ))}
            </div>
        </DashboardCard>
    );
};

export default ImmediateTreatmentPanel;
