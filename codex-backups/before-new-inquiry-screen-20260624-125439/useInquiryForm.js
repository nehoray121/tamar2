import { useState } from 'react';

export function useInquiryForm() {
    const [activeTab, setActiveTab] = useState('form');
    return { activeTab, setActiveTab };
}
