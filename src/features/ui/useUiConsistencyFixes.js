import { useEffect } from 'react';

const textOf = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

const findLeafByText = (root, values) => Array.from(root.querySelectorAll('*')).find((element) => (
    element.children.length === 0 && values.includes(textOf(element))
));

const findLeafExact = (root, value) => Array.from(root.querySelectorAll('*')).find((element) => (
    element.children.length === 0 && textOf(element) === value
));

const findCard = (titleElement) => {
    if (!titleElement) return null;
    const semantic = titleElement.closest('section, article, [role="region"]');
    if (semantic) return semantic;

    let current = titleElement.parentElement;
    while (current && current !== document.body) {
        const style = getComputedStyle(current);
        const radius = Number.parseFloat(style.borderRadius || '0');
        const hasBorder = style.borderStyle !== 'none' && style.borderWidth !== '0px';
        if (hasBorder && radius >= 12 && current.clientWidth >= 280 && current.clientHeight >= 220) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
};

const findBodyBranch = (card, titleElement, emptyElement) => {
    if (!card || !emptyElement) return null;
    let current = emptyElement;
    let candidate = emptyElement.parentElement;

    while (current.parentElement && current.parentElement !== card) {
        const parent = current.parentElement;
        if (titleElement && parent.contains(titleElement)) break;
        candidate = parent;
        current = parent;
    }

    return candidate;
};

const renderStandardEmptyState = (body) => {
    if (!body) return;
    if (body.dataset.tamarStandardEmpty === 'true') return;

    body.dataset.tamarStandardEmpty = 'true';
    body.style.background = '#ffffff';
    body.style.backgroundColor = '#ffffff';
    body.style.backgroundImage = 'none';
    body.style.display = 'flex';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.minHeight = '220px';

    body.innerHTML = `
        <div data-tamar-empty-state="true" style="display:flex;min-height:220px;width:100%;align-items:center;justify-content:center;background:#fff;color:#94a3b8;font-size:16px;font-weight:800;text-align:center;">
            אין נתונים להצגה
        </div>
    `;
};

const standardizeDashboardCard = (root, title) => {
    const titleElement = findLeafExact(root, title);
    if (!titleElement) return;

    const card = findCard(titleElement);
    if (!card) return;

    const existingStandard = card.querySelector('[data-tamar-empty-state="true"]');
    if (existingStandard) {
        existingStandard.textContent = 'אין נתונים להצגה';
        return;
    }

    const emptyElement = findLeafByText(card, [
        'אין נתונים לתצוגה',
        'אין נתונים להצגה',
        'לא נמצאו נתונים'
    ]);
    if (!emptyElement) return;

    const body = findBodyBranch(card, titleElement, emptyElement);
    renderStandardEmptyState(body);
};

const standardizeDashboardEmptyStates = (root) => {
    standardizeDashboardCard(root, 'פילוח לפי דחיפות');
    standardizeDashboardCard(root, 'מגמת פניות תקופתית');
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
        return /(?:^|\s)(חובה|רשות)\s*[?·•|]/u.test(value);
    });

    subtitleCandidates.forEach((element) => {
        const raw = textOf(element);
        const parts = raw
            .split(/[?·•|]/u)
            .map((part) => part.trim())
            .filter(Boolean);
        if (!parts.length) return;

        const required = parts.find((part) => part === 'חובה' || part === 'רשות');
        const scopeWords = new Set(['מערכת']);
        const detailParts = parts.filter((part) => part !== required && !scopeWords.has(part));
        const dependency = detailParts.find((part) => /תלוי|שדה אחר|מילוי בשדה אחר/u.test(part));
        const type = detailParts.filter((part) => part !== dependency).join(' · ');

        const spans = [];
        if (required === 'חובה') {
            spans.push('<span style="color:#dc2626;font-weight:800">חובה</span>');
        } else if (required === 'רשות') {
            spans.push('<span style="font-weight:600">רשות</span>');
        }

        if (type) spans.push(`<span>${type}</span>`);

        if (dependency) {
            const dependencyText = dependency.replace('מילוי בשדה אחר', 'תלוי בשדה אחר');
            spans.push(`<span>(${dependencyText})</span>`);
        }

        if (!spans.length) return;
        element.innerHTML = spans.join(' <span style="opacity:.55">•</span> ');
        element.dataset.uiFieldMetaPatched = 'true';
    });

    // Clean old metadata generated by the previous UI patch as well.
    Array.from(root.querySelectorAll('[data-ui-field-meta-patched="true"], [data-ui-field-meta-patched]')).forEach((element) => {
        Array.from(element.querySelectorAll('span')).forEach((span) => {
            if (textOf(span) === 'מערכת') {
                const previous = span.previousElementSibling;
                if (previous && textOf(previous) === '•') previous.remove();
                span.remove();
            }
        });
    });

    const protectedBadges = Array.from(root.querySelectorAll('*')).filter((element) => (
        element.children.length === 0 && textOf(element) === 'מוגן'
    ));
    protectedBadges.forEach((badge) => {
        badge.style.marginInlineStart = '8px';
    });
};

const applyDashboardFixes = () => {
    standardizeDashboardEmptyStates(document.body);
};

const applySettingsFixes = () => {
    flattenNestedScrollbars(document.body);
    decorateSettingsFieldRows(document.body);
};

export const useUiConsistencyFixes = (currentView) => {
    useEffect(() => {
        let scheduled = false;
        const run = () => {
            scheduled = false;
            if (currentView === 'dashboard') applyDashboardFixes();
            if (currentView === 'settings') applySettingsFixes();
        };
        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(run);
        };

        const observer = new MutationObserver(schedule);
        run();
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true
        });

        return () => observer.disconnect();
    }, [currentView]);
};
