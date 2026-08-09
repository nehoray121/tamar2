import React from 'react';
import TicketListPage from '../TicketListPage/TicketListPage.jsx';

const ExternalInquiriesPage = () => (
    <TicketListPage
        title="פניות חיצוניות"
        description="כאן מוצגות כל הפניות שהועברו מחדרכם או הועברו לחדרכם מחדר אחר. ניתן לעבור בין הקטגוריות בעזרת הכפתורים מעלה"
        showToggle={true}
        isExternal={true}
        viewType="external"
    />
);

export default ExternalInquiriesPage;
