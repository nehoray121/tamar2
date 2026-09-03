import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import { formatDashboardDate } from '../utils/dashboard.utils.js';

const priorityTone = (priority) => {
    const label = String(priority || '').replace(/-\d+$/, '');

    if (label.includes('גבוה')) return 'danger';
    if (label.includes('בינונ')) return 'warning';
    if (label.includes('נמוכ')) return 'primary';

    return 'info';
};

const DashboardInquiryListItem = ({ item }) => {
    const tone = priorityTone(item.priority);
    const dateLabel = item.date
        ? formatDashboardDate(
            item.date,
            { day: '2-digit', month: 'short', year: 'numeric' }
        )
        : '—';

    return (
        <article className="dashboard-modal-inquiry-row-v4b">
            <div className="dashboard-modal-inquiry-row-v4b__main">
                <div className="dashboard-modal-inquiry-row-v4b__title">
                    <strong>{item.subject || item.requester || 'ללא נושא'}</strong>
                    <span className="dashboard-modal-inquiry-row-v4b__id">
                        {item.id}
                    </span>
                </div>

                <p>
                    {item.description || 'אין תיאור נוסף לפנייה זו.'}
                </p>
            </div>

            <div className="dashboard-modal-inquiry-row-v4b__meta">
                <span className={`dashboard-priority-badge-v4b dashboard-priority-badge-v4b--${tone}`}>
                    <span className="dashboard-priority-badge-v4b__dot" />
                    {String(item.priority || '—').replace(/-\d+$/, '')}
                </span>

                <span
                    className={`dashboard-status-badge-v4b ${
                        item.status === 'open'
                            ? 'dashboard-status-badge-v4b--open'
                            : ''
                    }`}
                >
                    {item.status === 'open' ? 'פתוחה' : 'סגורה'}
                </span>

                <span>
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    {dateLabel}
                </span>

                <span>
                    <Icon name="user" className="h-3.5 w-3.5" />
                    {item.assignee || 'לא משויך'}
                </span>

                {item.phone && (
                    <span dir="ltr">
                        <Icon name="phone" className="h-3.5 w-3.5" />
                        {item.phone}
                    </span>
                )}
            </div>
        </article>
    );
};

export default DashboardInquiryListItem;
