import React from 'react';
import TicketListPage from '../TicketListPage/TicketListPage.jsx';

const InquiryHistoryPage = () => (
    <TicketListPage
        title="היסטוריית פניות - מנדיי"
        description="כאן מוצגות כל הפניות שניסגרו, המערכת משמשת כארכיון לתקלות, ניתן לסנן לפי שלל המסננים המתאימים"
        viewType="history"
    />
);

export default InquiryHistoryPage;
