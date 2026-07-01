import { useState } from 'react';

export function useExpandedDashboardPanel() {
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleExpandedSection = (section) => {
        setExpandedSection((currentSection) => (currentSection === section ? null : section));
    };

    return {
        expandedSection,
        setExpandedSection,
        fullSectionExpansion: expandedSection === 'barChart' || expandedSection === 'donut',
        toggleExpandedSection
    };
}
