import React from 'react';
import TicketListPage from '../TicketListPage/TicketListPage.jsx';

const MyTasksPage = () => (
    <TicketListPage
        title="המשימות שלי - מנדיי"
        description="כאן מוצגות כל המשימות שנמצאות תחת טיפול. קיימות כפתורים על מנת לבצע פעולות שונות"
        viewType="my_tasks"
    />
);

export default MyTasksPage;
