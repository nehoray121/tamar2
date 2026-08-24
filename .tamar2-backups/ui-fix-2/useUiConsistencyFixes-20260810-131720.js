import { useEffect } from 'react';

const textOf = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

const findLeafByExactText = (root, value) => Array.from(root.querySelectorAll('*')).find(
    (element) => element.children.length === 0 && textOf(element) === value
);

const nearestCard = (element) => {
    if (!element) return null;
    return element.closest('section, article, [role="region"], .rounded-2xl, .rounded-3xl, .rounded-\[32px\]')
        || element.parentElement?.closest('div')
        || element.parentElement
        || null;
};

const clonePieEmptyStateIntoTrendCard = (root) => {
    const pieText = findLeafByExactText(root, 'אין נתונים לתצוגה');
    const trendText = findLeafByExactText(root, 'לא נמצאו נתונים');
    if (!pieText || !trendText) return;

    const pieContainer = pieText.closest('div');
    const trendContainer = trendText.closest('div');
    if (!pieContainer || !trendContainer || trendContainer.dataset.uiFixedTrend === 'true') return;

    const clone = pieContainer.cloneNode(true);
    clone.dataset.uiFixedTrend = 'true';

    const bodyText = Array.from(clone.querySelectorAll('*')).find(
        (element) => element.children.length === 0 && textOf(element) === 'אין נתונים לתצוגה'
    );
    if (bodyText) {
        bodyText.textContent = 'אין נתונים לתצוגה';
    }
    const secondary = Array.from(clone.querySelectorAll('*')).find(
        (element) => element.children.length === 0 && textOf(element).includes('עדיין לא נצבר מידע')
    );
    if (secondary) {
        secondary.textContent = 'אין נתונים זמינים להצגה כרגע.';
    }

    trendContainer.replaceWith(clone);
};

const flattenNestedScrollbars = (root) => {
    const scrollers = Array.from(root.querySelectorAll('*')).filter((element) => {
        if (element instanceof HTMLTextAreaElement) return false;
        const style = getComputedStyle(element);
        const hasScrollableOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll';
        const canActuallyScroll = element.scrollHeight > element.clientHeight + 8;
        return hasScrollableOverflow && canActuallyScroll && element.clientHeight < 480;
    });

    scrollers.forEach((element) => {
        element.style.overflowY = 'visible';
        element.style.maxHeight = 'none';
        element.style.height = 'auto';
        if (element.parentElement) {
            const parentStyle = getComputedStyle(element.parentElement);
            if (parentStyle.overflowY === 'auto' || parentStyle.overflowY === 'scroll') {
                element.parentElement.style.overflowY = 'visible';
                element.parentElement.style.maxHeight = 'none';
                element.parentElement.style.height = 'auto';
            }
        }
    });
};

const decorateSettingsFieldRows = (root) => {
    const subtitleCandidates = Array.from(root.querySelectorAll('p, span, div')).filter((element) => {
        if (element.children.length > 0) return false;
        const value = textOf(element);
        return /(?:^|\s)(חובה|רשות)\s*\?/u.test(value) || /(?:^|\s)(חובה|רשות)\s*·/u.test(value);
    });

    subtitleCandidates.forEach((element) => {
        if (element.dataset.uiFieldMetaPatched === 'true') return;
        const raw = textOf(element);
        const parts = raw.split(/[?·•|]/u).map((part) => part.trim()).filter(Boolean);
        if (!parts.length) return;

        const required = parts.find((part) => part === 'חובה' || part === 'רשות');
        const scope = parts.find((part) => ['מערכת', 'חדר', 'סביבה', 'תת סביבה', 'תת-סביבה'].includes(part));
        const detailParts = parts.filter((part) => part !== required && part !== scope);
        const dependency = detailParts.find((part) => /תלוי|שדה אחר|מילוי בשדה אחר/u.test(part));
        const type = detailParts.filter((part) => part !== dependency).join(' · ');

        const spans = [];
        if (required) {
            if (required === 'חובה') {
                spans.push('<span style="color:#dc2626;font-weight:700">חובה</span>');
            } else {
                spans.push('<span style="font-weight:600">רשות</span>');
            }
        }
        if (type) {
            spans.push(`<span>${type}</span>`);
        }
        if (dependency) {
            let dependencyText = dependency;
            dependencyText = dependencyText.replace('מילוי בשדה אחר', 'תלוי בשדה אחר');
            spans.push(`<span>(${dependencyText})</span>`);
        }
        if (scope) {
            spans.push(`<span>${scope}</span>`);
        }

        if (!spans.length) return;
        element.innerHTML = spans.join(' <span style="opacity:.55">•</span> ');
        element.dataset.uiFieldMetaPatched = 'true';
    });

    const protectedBadges = Array.from(root.querySelectorAll('*')).filter((element) => {
        return element.children.length === 0 && textOf(element) === 'מוגן';
    });
    protectedBadges.forEach((badge) => {
        badge.style.marginInlineStart = '8px';
    });
};

const applyDashboardFixes = () => {
    const root = document.body;
    clonePieEmptyStateIntoTrendCard(root);
};

const applySettingsFixes = () => {
    const root = document.body;
    flattenNestedScrollbars(root);
    decorateSettingsFieldRows(root);
};

export const useUiConsistencyFixes = (currentView) => {
    useEffect(() => {
        const run = () => {
            if (currentView === 'dashboard') {
                applyDashboardFixes();
            }
            if (currentView === 'settings') {
                applySettingsFixes();
            }
        };

        const observer = new MutationObserver(() => {
            run();
        });

        run();
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true
        });

        return () => observer.disconnect();
    }, [currentView]);
};
